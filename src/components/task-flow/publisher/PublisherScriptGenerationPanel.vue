<script setup>
import { computed } from 'vue'
import { jobsNamed, parseJsonObject } from './publisherUtils'

const props = defineProps({
  narrations: { type: Array, default: () => [] },
  jobs: { type: Array, default: () => [] },
  operatorTasks: { type: Array, default: () => [] },
})

const narration = computed(() => props.narrations[0] || {})
const scriptJobs = computed(() => {
  const direct = jobsNamed(props.jobs, ['generate_narration_script'])
  const dynamic = props.jobs.filter(job => String(job.job_name || '').startsWith('script:'))
  return [...direct, ...dynamic].sort((left, right) => {
    return String(right.updated_at || right.completed_at || '').localeCompare(String(left.updated_at || left.completed_at || ''))
  })
})
const scriptJob = computed(() => scriptJobs.value[0] || {})
const jobInput = computed(() => parseJsonObject(scriptJob.value.input_json))
const jobResult = computed(() => parseJsonObject(scriptJob.value.result_json))
const operatorTask = computed(() => {
  const opId = scriptJob.value.operator_op_id || scriptJob.value.operator_run_id
  if (!opId) return {}
  return props.operatorTasks.find(row => row.op_id === opId || row.run_id === opId) || {}
})
const operatorRequest = computed(() => parseJsonObject(operatorTask.value.request_json))
const operatorResult = computed(() => parseJsonObject(operatorTask.value.result_json))
const inputText = computed(() => {
  return firstText(
    operatorRequest.value.text,
    operatorRequest.value.payload?.text,
    jobInput.value.request_text,
    jobInput.value.operator_request_text,
    jobInput.value.text,
  )
})
const sourceMaterialText = computed(() => sourceMaterialFromRequest(inputText.value))
const outputText = computed(() => {
  return firstText(
    narration.value.text,
    operatorResult.value.text,
    operatorResult.value.response?.text,
    jobResult.value.script,
    jobResult.value.text,
  )
})
const promptTemplate = computed(() => firstText(
  jobInput.value.prompt_template,
  jobInput.value.prompt,
  templateFromRequest(inputText.value),
))
const status = computed(() => scriptJob.value.status || narration.value.status || 'pending')
const metaItems = computed(() => [
  ['Job', scriptJob.value.job_name || 'generate_narration_script'],
  ['Prompt', jobInput.value.prompt_version || jobResult.value.prompt_version || narration.value.script_prompt_version],
  ['Source', jobInput.value.source_url || jobResult.value.source_url],
  ['Operator', scriptJob.value.operator_op_id || scriptJob.value.operator_run_id || operatorResult.value.taskId || operatorResult.value.runId],
].filter(([, value]) => value))

function firstText(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function templateFromRequest(text) {
  if (!text) return ''
  const template = text.replace(
    /<source_material>\s*[\s\S]*?\s*<\/source_material>/,
    '<source_material>\n{{SOURCE_TEXT}}\n</source_material>',
  )
  return template === text ? '' : template
}

function sourceMaterialFromRequest(text) {
  if (!text) return ''
  const match = text.match(/<source_material>\s*([\s\S]*?)\s*<\/source_material>/)
  return firstText(match?.[1], text)
}
</script>

<template>
  <div class="publisher-panel">
    <section class="flow-section narration-section">
      <h4>口播稿生成</h4>
      <div class="narration-status-line">
        <span :class="['stage-job-status', `status-${status}`]">{{ status }}</span>
        <span v-for="[label, value] in metaItems" :key="label">{{ label }}: {{ value }}</span>
      </div>

      <details class="script-generation-details">
        <summary>调用 operator 的入参文本</summary>
        <pre v-if="sourceMaterialText" class="script-generation-text">{{ sourceMaterialText }}</pre>
        <p v-else class="flow-muted">当前详情数据未包含完整 operator 入参文本。</p>
      </details>

      <details class="script-generation-details">
        <summary>提示词模板</summary>
        <pre v-if="promptTemplate" class="script-generation-text">{{ promptTemplate }}</pre>
        <p v-else class="flow-muted">当前详情数据未包含完整提示词模板。</p>
      </details>
    </section>

    <section class="flow-section narration-section">
      <h4>出参文本</h4>
      <pre v-if="outputText" class="script-generation-text script-generation-output">{{ outputText }}</pre>
      <p v-else class="flow-muted">暂无生成口播稿。</p>
      <pre v-if="scriptJob.error_message || narration.error_message" class="flow-stage-error">{{ scriptJob.error_message || narration.error_message }}</pre>
    </section>
  </div>
</template>
