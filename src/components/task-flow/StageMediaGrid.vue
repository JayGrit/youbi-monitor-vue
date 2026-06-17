<script setup>
import { computed } from 'vue'

const props = defineProps({
  media: { type: Array, default: () => [] },
  logAudioEvent: { type: Function, required: true },
  compact: { type: Boolean, default: false },
})

const visibleMedia = computed(() => props.media.filter(asset => !isCoverImage(asset)))

function isCoverImage(asset) {
  if (asset?.kind !== 'image') return false
  const text = [
    asset.name,
    asset.objectName,
    asset.url,
    ...(asset.names || []),
  ].filter(Boolean).join(' ').toLowerCase()
  return /cover|thumbnail|thumb|封面/.test(text)
}
</script>

<template>
  <div :class="['flow-section', { 'media-preview-compact': compact }]">
    <h4>Media Preview</h4>
    <div class="media-grid">
      <article
        v-for="asset in visibleMedia"
        :key="asset.url"
        :class="['media-item', { 'media-item-video': asset.kind === 'video' }]"
      >
        <div v-if="asset.kind !== 'video'" class="media-title">
          <strong>{{ asset.name }}</strong>
        </div>
        <video v-if="asset.kind === 'video'" :src="asset.url" controls preload="metadata"></video>
        <audio
          v-else-if="asset.kind === 'audio'"
          :src="asset.url"
          controls
          preload="none"
          @loadstart="event => logAudioEvent('loadstart', asset, event)"
          @play="event => logAudioEvent('play', asset, event)"
          @playing="event => logAudioEvent('playing', asset, event)"
          @waiting="event => logAudioEvent('waiting', asset, event)"
          @error="event => logAudioEvent('error', asset, event)"
        ></audio>
        <img v-else-if="asset.kind === 'image'" :src="asset.url" alt="" />
        <div v-else class="media-file-preview">{{ asset.kind || 'file' }}</div>
        <p v-if="asset.kind !== 'video' && asset.objectName">{{ asset.objectName }}</p>
      </article>
    </div>
  </div>
</template>
