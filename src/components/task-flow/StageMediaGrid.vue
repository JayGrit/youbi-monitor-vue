<script setup>
defineProps({
  media: { type: Array, default: () => [] },
  logAudioEvent: { type: Function, required: true },
})
</script>

<template>
  <div class="flow-section">
    <h4>Media Preview</h4>
    <div class="media-grid">
      <article v-for="asset in media" :key="asset.url" class="media-item">
        <div class="media-title">
          <strong>{{ asset.name }}</strong>
          <a :href="asset.url" target="_blank" rel="noreferrer">打开</a>
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
        <p v-if="asset.objectName">{{ asset.objectName }}</p>
      </article>
    </div>
  </div>
</template>
