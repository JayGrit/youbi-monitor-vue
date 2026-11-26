<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

defineProps({
  activePage: { type: String, required: true },
  flowPageOpen: { type: Boolean, default: false },
})

const emit = defineEmits(['openPage'])
const moreMenu = ref(null)
const moreButton = ref(null)
const moreOpen = ref(false)

const morePages = [
  { id: 'submitter-authors', label: '作者管理' },
  { id: 'static-assets', label: '素材' },
  { id: 'dag-layouts', label: '流程图布局' },
  { id: 'speaker', label: '配音' },
  { id: 'failure-logs', label: '错误日志' },
]

function closeMore(event) {
  if (!moreMenu.value?.contains(event.target)) moreOpen.value = false
}

function dismissMore() {
  if (!moreOpen.value) return
  moreOpen.value = false
  moreButton.value?.focus()
}

function openMorePage(page) {
  dismissMore()
  emit('openPage', page)
}

onMounted(() => document.addEventListener('click', closeMore))
onUnmounted(() => document.removeEventListener('click', closeMore))
</script>

<template>
  <header class="top-bar">
    <nav class="page-tabs" aria-label="页面切换">
      <div class="page-tabs-primary">
        <button
          type="button"
          :class="{ active: activePage === 'newyouth' && !flowPageOpen }"
          @click="emit('openPage', 'newyouth')"
        >
          新青年
        </button>
        <button
          type="button"
          :class="{ active: activePage === 'submitter' && !flowPageOpen }"
          @click="emit('openPage', 'submitter')"
        >
          稿件
        </button>
        <button
          type="button"
          :class="{ active: activePage === 'monitor' || flowPageOpen }"
          @click="emit('openPage', 'monitor')"
        >
          监控
        </button>
        <button
          type="button"
          :class="{ active: activePage === 'accounts' && !flowPageOpen }"
          @click="emit('openPage', 'accounts')"
        >
          账号
        </button>
        <button
          type="button"
          :class="{ active: activePage === 'server' && !flowPageOpen }"
          @click="emit('openPage', 'server')"
        >
          服务器
        </button>
        <button
          type="button"
          :class="{ active: activePage === 'operator-diagnostics' && !flowPageOpen }"
          @click="emit('openPage', 'operator-diagnostics')"
        >
          诊断
        </button>
        <button
          type="button"
          :class="{ active: activePage === 'ffmpeger' && !flowPageOpen }"
          @click="emit('openPage', 'ffmpeger')"
        >
          合成
        </button>
        <button
          type="button"
          :class="{ active: activePage === 'airouter' && !flowPageOpen }"
          @click="emit('openPage', 'airouter')"
        >
          中转
        </button>
      </div>
      <div ref="moreMenu" class="page-tabs-more" @keydown.esc="dismissMore">
        <button
          ref="moreButton"
          type="button"
          :class="{ active: !flowPageOpen && morePages.some(page => page.id === activePage) }"
          :aria-expanded="moreOpen"
          aria-controls="page-tabs-more-panel"
          @click="moreOpen = !moreOpen"
        >
          其他 <span aria-hidden="true">▾</span>
        </button>
        <div v-show="moreOpen" id="page-tabs-more-panel" class="page-tabs-more-panel">
          <button
            v-for="page in morePages"
            :key="page.id"
            type="button"
            :class="{ active: activePage === page.id && !flowPageOpen }"
            @click="openMorePage(page.id)"
          >
            {{ page.label }}
          </button>
        </div>
      </div>
    </nav>
  </header>
</template>
