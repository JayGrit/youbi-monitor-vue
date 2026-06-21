<script setup>
import { computed, ref } from 'vue'
import { copyText, jobsNamed, parseJsonObject } from './publisherUtils'

const props = defineProps({
  narrations: { type: Array, default: () => [] },
  sentences: { type: Array, default: () => [] },
  jobs: { type: Array, default: () => [] },
  submitSegments: { type: Function, required: true },
})

const response = ref('')
const busy = ref(false)
const message = ref('')
const error = ref('')
const copied = ref(false)
const narration = computed(() => props.narrations[0] || {})
const segmentJobs = computed(() => jobsNamed(props.jobs, ['generate_segment_plan']))
const request = computed(() => {
  const input = parseJsonObject(segmentJobs.value[0]?.input_json)
  return input.request ? JSON.stringify(input.request, null, 2) : ''
})
const orderedSentences = computed(() => [...props.sentences].sort((left, right) => {
  return Number(left.line_index ?? left.id ?? 0) - Number(right.line_index ?? right.id ?? 0)
}))
const totalChars = computed(() => orderedSentences.value.reduce((total, row) => {
  return total + String(row.sentence_text || '').replace(/\s/g, '').length
}, 0))
const segmentParagraphs = computed(() => {
  const grouped = new Map()
  for (const row of orderedSentences.value) {
    const index = Number(row.segment_index ?? 1)
    if (!grouped.has(index)) grouped.set(index, [])
    grouped.get(index).push(String(row.sentence_text || '').trim())
  }
  return [...grouped.entries()]
    .sort(([left], [right]) => left - right)
    .map(([index, sentences]) => ({ index, text: sentences.filter(Boolean).join('') }))
})
const completed = computed(() => {
  return orderedSentences.value.length > 0 && segmentJobs.value.some(job => job.status === 'success')
})

async function copyRequest() {
  await copyText(request.value)
  copied.value = true
  window.setTimeout(() => { copied.value = false }, 1600)
}

async function submit() {
  if (!response.value.trim() || busy.value) return
  busy.value = true
  message.value = ''
  error.value = ''
  try {
    const result = await props.submitSegments(response.value)
    response.value = ''
    message.value = `已写入 ${result.sentenceCount} 句、${result.segmentCount} 个片段`
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="publisher-panel">
    <section class="flow-section narration-section">
      <h4>文案分段</h4>
      <div class="narration-status-line">
        <span :class="['stage-job-status', `status-${narration.status || 'pending'}`]">{{ narration.status || 'pending' }}</span>
        <span>{{ orderedSentences.length }} 句</span>
        <span>共 {{ totalChars }} 字</span>
      </div>
      <div v-if="segmentParagraphs.length" class="narration-segment-paragraphs">
        <p v-for="segment in segmentParagraphs" :key="segment.index">{{ segment.text }}</p>
      </div>
      <p v-else class="narration-text">{{ narration.text || '暂无旁白文本' }}</p>
      <section v-if="!completed" class="narration-manual-card">
        <div class="narration-manual-head">
          <strong>人工分段</strong>
          <button type="button" :disabled="!request" @click="copyRequest">
            {{ copied ? '已复制' : '复制完整请求' }}
          </button>
        </div>
        <p v-if="!request" class="flow-muted">暂无完整请求；请先让 publisher 执行一次分段任务。</p>
        <textarea v-model="response" rows="5" placeholder='粘贴大模型返回值，例如 {"end_line_ids":[8,17,25]}'></textarea>
        <div class="narration-manual-actions">
          <button type="button" :disabled="busy || !response.trim()" @click="submit">
            {{ busy ? '校验并提交中' : '校验并提交分段' }}
          </button>
          <span v-if="message" class="narration-manual-success">{{ message }}</span>
        </div>
        <p v-if="error" class="inline-error">{{ error }}</p>
      </section>
      <pre v-if="narration.error_message" class="flow-stage-error">{{ narration.error_message }}</pre>
    </section>
  </div>
</template>
