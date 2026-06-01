<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  media: { type: Array, default: () => [] },
  logAudioEvent: { type: Function, required: true },
})

const waveformByUrl = ref({})
const canvasRefs = new Map()
const resizeObserver = typeof ResizeObserver === 'undefined'
  ? null
  : new ResizeObserver(entries => {
    for (const entry of entries) {
      drawCanvas(entry.target)
    }
  })
let audioContext = null

const audioItems = computed(() => {
  const labels = [
    { key: 'vocals', title: '人声音频' },
    { key: 'bgm', title: '背景声音频' },
  ]
  return labels.map(label => ({
    ...label,
    asset: findAsset(label.key),
  }))
})

watch(
  () => props.media.map(asset => asset.url).join('|'),
  async () => {
    waveformByUrl.value = {}
    await nextTick()
    for (const item of audioItems.value) {
      if (item.asset?.url) {
        loadWaveform(item.asset)
      }
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  if (audioContext) {
    audioContext.close()
  }
})

function findAsset(key) {
  return props.media.find(asset => asset.key === key) || null
}

function setCanvasRef(url, element) {
  const existing = canvasRefs.get(url)
  if (existing && existing !== element) {
    resizeObserver?.unobserve(existing)
  }
  if (!element) {
    canvasRefs.delete(url)
    return
  }
  canvasRefs.set(url, element)
  resizeObserver?.observe(element)
  drawCanvas(element)
}

async function loadWaveform(asset) {
  if (!asset?.url || waveformByUrl.value[asset.url]?.status === 'loading') return
  waveformByUrl.value = {
    ...waveformByUrl.value,
    [asset.url]: { status: 'loading', volumes: [] },
  }
  try {
    const response = await fetch(asset.url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const arrayBuffer = await response.arrayBuffer()
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext
    if (!AudioContextConstructor) {
      throw new Error('当前浏览器不支持 AudioContext')
    }
    audioContext = audioContext || new AudioContextConstructor()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    const volumes = calculateRmsVolumes(audioBuffer)
    waveformByUrl.value = {
      ...waveformByUrl.value,
      [asset.url]: { status: 'ready', volumes },
    }
    await nextTick()
    drawCanvas(canvasRefs.get(asset.url))
  } catch (err) {
    waveformByUrl.value = {
      ...waveformByUrl.value,
      [asset.url]: {
        status: 'error',
        volumes: [],
        message: err instanceof Error ? err.message : String(err),
      },
    }
  }
}

function calculateRmsVolumes(audioBuffer) {
  const channelData = audioBuffer.getChannelData(0)
  const sampleCount = Math.min(1200, Math.max(240, Math.floor(channelData.length / 512)))
  const blockSize = Math.max(1, Math.floor(channelData.length / sampleCount))
  const volumes = []
  let max = 0
  for (let i = 0; i < sampleCount; i += 1) {
    let sum = 0
    const start = i * blockSize
    for (let j = 0; j < blockSize; j += 1) {
      const value = channelData[start + j] || 0
      sum += value * value
    }
    const rms = Math.sqrt(sum / blockSize)
    volumes.push(rms)
    max = Math.max(max, rms)
  }
  return max > 0 ? volumes.map(value => value / max) : volumes
}

function drawCanvas(canvas) {
  if (!canvas) return
  const url = canvas.dataset.url
  const waveform = waveformByUrl.value[url]
  const volumes = waveform?.volumes || []
  const width = Math.max(1, Math.floor(canvas.clientWidth))
  const height = Math.max(1, Math.floor(canvas.clientHeight))
  const pixelRatio = window.devicePixelRatio || 1
  const targetWidth = Math.floor(width * pixelRatio)
  const targetHeight = Math.floor(height * pixelRatio)
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth
    canvas.height = targetHeight
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#eef3f8'
  ctx.fillRect(0, 0, width, height)
  ctx.strokeStyle = '#cbd5e1'
  ctx.beginPath()
  ctx.moveTo(0, height / 2)
  ctx.lineTo(width, height / 2)
  ctx.stroke()
  if (!volumes.length) return
  const barWidth = Math.max(1, width / volumes.length)
  ctx.fillStyle = '#2563eb'
  volumes.forEach((volume, index) => {
    const barHeight = Math.max(1, volume * height * 0.86)
    const x = index * barWidth
    const y = (height - barHeight) / 2
    ctx.fillRect(x, y, Math.max(1, barWidth * 0.72), barHeight)
  })
}
</script>

<template>
  <div class="demucs-audio-panel">
    <article v-for="item in audioItems" :key="item.key" class="demucs-audio-item">
      <div class="demucs-audio-head">
        <strong>{{ item.title }}</strong>
        <a v-if="item.asset" :href="item.asset.url" target="_blank" rel="noreferrer">打开</a>
      </div>

      <template v-if="item.asset">
        <canvas
          class="demucs-waveform"
          :data-url="item.asset.url"
          :ref="element => setCanvasRef(item.asset.url, element)"
        ></canvas>
        <div class="demucs-waveform-status">
          <span v-if="waveformByUrl[item.asset.url]?.status === 'loading'">波形加载中</span>
          <span v-else-if="waveformByUrl[item.asset.url]?.status === 'error'">
            波形解析失败：{{ waveformByUrl[item.asset.url]?.message }}
          </span>
        </div>
        <audio
          :src="item.asset.url"
          controls
          preload="metadata"
          @loadstart="event => logAudioEvent('loadstart', item.asset, event)"
          @play="event => logAudioEvent('play', item.asset, event)"
          @playing="event => logAudioEvent('playing', item.asset, event)"
          @waiting="event => logAudioEvent('waiting', item.asset, event)"
          @error="event => logAudioEvent('error', item.asset, event)"
        ></audio>
        <p v-if="item.asset.objectName">{{ item.asset.objectName }}</p>
      </template>

      <div v-else class="demucs-audio-empty">暂无音频</div>
    </article>
  </div>
</template>
