<script setup>
import { computed } from 'vue'

const props = defineProps({
  processing: { type: Object, default: null },
})

function sortedRows(rows, key) {
  return [...(Array.isArray(rows) ? rows : [])].sort((a, b) => Number(a?.[key] || 0) - Number(b?.[key] || 0))
}

function overlapMs(a, b) {
  const start = Math.max(Number(a?.startTime || 0), Number(b?.startTime || 0))
  const end = Math.min(Number(a?.endTime || 0), Number(b?.endTime || 0))
  return Math.max(0, end - start)
}

function msLabel(value) {
  const ms = Math.max(0, Number(value || 0))
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const millis = String(ms % 1000).padStart(3, '0')
  return `${minutes}:${String(seconds).padStart(2, '0')}.${millis}`
}

function rangeLabel(row) {
  return `${msLabel(row?.startTime)} - ${msLabel(row?.endTime)}`
}

const rawAlignedRows = computed(() => {
  const rawSegments = sortedRows(props.processing?.rawSegments, 'rawIndex')
  const alignedSegments = sortedRows(props.processing?.alignedSegments, 'alignedIndex')
  const groups = new Map(rawSegments.map(row => [Number(row.id), []]))

  for (const aligned of alignedSegments) {
    let bestRaw = null
    let bestOverlap = 0
    for (const raw of rawSegments) {
      const overlap = overlapMs(raw, aligned)
      if (overlap > bestOverlap) {
        bestRaw = raw
        bestOverlap = overlap
      }
    }
    if (!bestRaw && aligned.rawSegmentId != null) {
      bestRaw = rawSegments.find(raw => Number(raw.id) === Number(aligned.rawSegmentId)) || null
    }
    if (bestRaw) {
      groups.get(Number(bestRaw.id))?.push(aligned)
    }
  }

  return rawSegments.map(raw => ({
    raw,
    children: (groups.get(Number(raw.id)) || []).sort((a, b) => Number(a.alignedIndex || 0) - Number(b.alignedIndex || 0)),
  }))
})

const splitRows = computed(() => {
  const pysbdSegments = sortedRows(props.processing?.pysbdSegments, 'pysbdIndex')
  const splitSegments = sortedRows(props.processing?.splitSegments, 'splitIndex')
  const groups = new Map()
  for (const split of splitSegments) {
    const key = Number(split.pysbdSegmentId)
    groups.set(key, [...(groups.get(key) || []), split])
  }
  return pysbdSegments
    .map(pysbd => ({
      pysbd,
      children: (groups.get(Number(pysbd.id)) || []).sort((a, b) => Number(a.splitIndex || 0) - Number(b.splitIndex || 0)),
    }))
    .filter(row => row.children.length)
})
</script>

<template>
  <section v-if="processing" class="whisper-processing">
    <div class="processing-block">
      <div class="processing-head">
        <h4>Raw -> Aligned</h4>
        <span>{{ rawAlignedRows.length }} raw / {{ processing.alignedSegments?.length || 0 }} aligned</span>
      </div>
      <table class="processing-table">
        <tbody>
          <tr v-for="row in rawAlignedRows" :key="row.raw.id">
            <td>
              <div class="segment-meta">
                Raw #{{ row.raw.rawIndex }} · {{ rangeLabel(row.raw) }} · {{ row.children.length }} aligned
              </div>
              <div v-if="row.children.length" class="segment-stream">
                <span
                  v-for="(segment, index) in row.children"
                  :key="segment.id"
                  class="segment-chip"
                  :class="index % 2 === 0 ? 'tone-red' : 'tone-blue'"
                  :title="`Aligned #${segment.alignedIndex} · ${rangeLabel(segment)}`"
                >
                  {{ segment.text }}
                </span>
              </div>
              <div v-else class="segment-original">{{ row.raw.text }}</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="processing-block">
      <div class="processing-head">
        <h4>Pysbd -> Split</h4>
        <span>{{ splitRows.length }} pysbd rows / {{ processing.splitSegments?.length || 0 }} split</span>
      </div>
      <table class="processing-table">
        <tbody>
          <tr v-for="row in splitRows" :key="row.pysbd.id">
            <td>
              <div class="segment-meta">
                Pysbd #{{ row.pysbd.pysbdIndex }} · {{ rangeLabel(row.pysbd) }} · {{ row.children.length }} split
              </div>
              <div class="segment-original">{{ row.pysbd.text }}</div>
              <div class="segment-stream">
                <span
                  v-for="(segment, index) in row.children"
                  :key="segment.id"
                  class="segment-chip"
                  :class="index % 2 === 0 ? 'tone-red' : 'tone-blue'"
                  :title="`Split #${segment.splitIndex} · ${rangeLabel(segment)} · ${segment.splitReason || ''}`"
                >
                  {{ segment.text }}
                </span>
              </div>
            </td>
          </tr>
          <tr v-if="!splitRows.length">
            <td class="segment-empty">No split rows</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.whisper-processing {
  display: grid;
  gap: 18px;
  margin-top: 22px;
}

.processing-block {
  min-width: 0;
}

.processing-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.processing-head h4 {
  margin: 0;
  color: #172033;
  font-size: 15px;
  font-weight: 700;
}

.processing-head span {
  color: #687083;
  font-size: 12px;
}

.processing-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  border: 1px solid #dde3ec;
  background: #fff;
}

.processing-table td {
  padding: 10px 12px;
  border-top: 1px solid #e8edf4;
  vertical-align: top;
}

.processing-table tr:first-child td {
  border-top: 0;
}

.segment-meta {
  margin-bottom: 6px;
  color: #5d6678;
  font-size: 12px;
  font-weight: 600;
}

.segment-original {
  margin-bottom: 7px;
  color: #6d7380;
  font-size: 12px;
  line-height: 1.55;
}

.segment-stream {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  line-height: 1.7;
}

.segment-chip {
  display: inline;
  padding: 1px 3px;
  border-radius: 3px;
  font-size: 13px;
  overflow-wrap: anywhere;
}

.tone-red {
  color: #b42318;
  background: #fff1f0;
}

.tone-blue {
  color: #175cd3;
  background: #eff8ff;
}

.segment-empty {
  color: #7c8494;
  font-size: 13px;
}
</style>
