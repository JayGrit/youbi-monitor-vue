<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  media: { type: Array, default: () => [] },
  logAudioEvent: { type: Function, required: true },
})

const waveformByUrl = ref({})
const waveformCanvas = ref(null)
const resizeObserver = typeof ResizeObserver === 'undefined'
  ? null
  : new ResizeObserver(entries => {
    for (const entry of entries) {
      drawCanvas(entry.target)
    }
  })
let audioContext = null

const audioItems = computed(() => [
  { key: 'vocals', title: '人声音频', shortTitle: '人声', asset: findAsset('vocals') },
  { key: 'bgm', title: '背景声音频', shortTitle: '背景声', asset: findAsset('bgm') },
])

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

function setCanvasRef(element) {
  if (waveformCanvas.value && waveformCanvas.value !== element) {
    resizeObserver?.unobserve(waveformCanvas.value)
  }
  waveformCanvas.value = element
  if (!element) return
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
    drawCanvas(waveformCanvas.value)
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
  drawSmoothWave(ctx, waveformByUrl.value[findAsset('bgm')?.url]?.volumes || [], width, height, '#16a34a', 0.26, 0.48)
  drawSmoothWave(ctx, waveformByUrl.value[findAsset('vocals')?.url]?.volumes || [], width, height, '#111827', 0.2, 0.36)
}

function drawSmoothWave(ctx, volumes, width, height, color, fillAlpha, scale) {
  if (!volumes.length) return
  const centerY = height / 2
  const points = volumes.map((volume, index) => ({
    x: volumes.length === 1 ? width / 2 : (index / (volumes.length - 1)) * width,
    top: centerY - volume * height * scale,
    bottom: centerY + volume * height * scale,
  }))

  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].top)
  for (let i = 0; i < points.length - 1; i += 1) {
    const current = points[i]
    const next = points[i + 1]
    const controlX = (current.x + next.x) / 2
    ctx.bezierCurveTo(controlX, current.top, controlX, next.top, next.x, next.top)
  }
  for (let i = points.length - 1; i > 0; i -= 1) {
    const current = points[i]
    const previous = points[i - 1]
    const controlX = (current.x + previous.x) / 2
    ctx.bezierCurveTo(controlX, current.bottom, controlX, previous.bottom, previous.x, previous.bottom)
  }
  ctx.closePath()
  ctx.fillStyle = hexToRgba(color, fillAlpha)
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].top)
  for (let i = 0; i < points.length - 1; i += 1) {
    const current = points[i]
    const next = points[i + 1]
    const controlX = (current.x + next.x) / 2
    ctx.bezierCurveTo(controlX, current.top, controlX, next.top, next.x, next.top)
  }
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.stroke()
}

function hexToRgba(hex, alpha) {
  const value = hex.replace('#', '')
  const number = Number.parseInt(value, 16)
  const red = (number >> 16) & 255
  const green = (number >> 8) & 255
  const blue = number & 255
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}
</script>

<template>
  <div class="demucs-audio-panel">
    <div class="demucs-audio-head">
      <div class="demucs-waveform-legend">
        <span class="demucs-legend-item vocals">人声</span>
        <span class="demucs-legend-item bgm">背景声</span>
      </div>
      <div class="demucs-audio-links">
        <a v-if="findAsset('vocals')" :href="findAsset('vocals').url" target="_blank" rel="noreferrer">打开人声</a>
        <a v-if="findAsset('bgm')" :href="findAsset('bgm').url" target="_blank" rel="noreferrer">打开背景声</a>
      </div>
    </div>

    <canvas class="demucs-waveform" :ref="setCanvasRef"></canvas>

    <div class="demucs-waveform-status">
      <template v-for="item in audioItems" :key="item.key">
        <span v-if="item.asset && waveformByUrl[item.asset.url]?.status === 'loading'">
          {{ item.shortTitle }}波形加载中
        </span>
        <span v-else-if="item.asset && waveformByUrl[item.asset.url]?.status === 'error'">
          {{ item.shortTitle }}波形解析失败：{{ waveformByUrl[item.asset.url]?.message }}
        </span>
      </template>
      <span v-if="!audioItems.some(item => item.asset)">暂无音频</span>
    </div>

    <div class="demucs-audio-players">
      <div v-for="item in audioItems" :key="item.key" :class="['demucs-audio-player', item.key]">
        <div class="demucs-audio-player-title">
          <span></span>
          <strong>{{ item.title }}</strong>
        </div>
        <audio
          v-if="item.asset"
          :src="item.asset.url"
          controls
          preload="metadata"
          @loadstart="event => logAudioEvent('loadstart', item.asset, event)"
          @play="event => logAudioEvent('play', item.asset, event)"
          @playing="event => logAudioEvent('playing', item.asset, event)"
          @waiting="event => logAudioEvent('waiting', item.asset, event)"
          @error="event => logAudioEvent('error', item.asset, event)"
        ></audio>
        <div v-else class="demucs-audio-empty">暂无音频</div>
      </div>
    </div>
  </div>
</template>
