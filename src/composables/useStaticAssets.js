import { computed, ref } from 'vue'

export const STATIC_ASSET_TYPES = [
  { value: '', label: '全部类型' },
  { value: 'video', label: '视频' },
  { value: 'audio', label: '音频' },
  { value: 'image', label: '图片' },
  { value: 'voice', label: '人声' },
  { value: 'text', label: '文本' },
  { value: 'font', label: '字体' },
]

const PAGE_SIZE = 40

export function useStaticAssets(api) {
  const assetRows = ref([])
  const assetTotal = ref(0)
  const assetTypeCounts = ref([])
  const assetLoading = ref(false)
  const assetError = ref('')
  const assetMessage = ref('')
  const assetTypeFilter = ref('')
  const assetScopeFilter = ref('all')
  const assetTaskIdFilter = ref('')
  const assetKeywordFilter = ref('')
  const assetPage = ref(1)
  const selectedAsset = ref(null)
  const selectedAssetLoading = ref(false)
  const selectedAssetError = ref('')
  const uploadAssetType = ref('image')
  const uploadAssetTaskId = ref('')
  const uploadAssetRemark = ref('')
  const uploadingAsset = ref(false)
  const textAssetTaskId = ref('')
  const textAssetRemark = ref('')
  const textAssetContent = ref('')
  const creatingTextAsset = ref(false)

  const assetPageCount = computed(() => Math.max(1, Math.ceil(assetTotal.value / PAGE_SIZE)))
  const assetTypeSummary = computed(() => assetTypeCounts.value
    .map(item => `${assetTypeLabel(item.type)} ${item.count}`)
    .join(' · '))

  async function loadStaticAssets(quiet = false) {
    if (!quiet) assetLoading.value = true
    try {
      const payload = await api.listStaticAssets({
        type: assetTypeFilter.value,
        taskId: assetTaskIdFilter.value.trim(),
        scope: assetScopeFilter.value,
        keyword: assetKeywordFilter.value.trim(),
        limit: PAGE_SIZE,
        offset: (assetPage.value - 1) * PAGE_SIZE,
      })
      assetRows.value = payload?.items || []
      assetTotal.value = Number(payload?.total || 0)
      assetTypeCounts.value = payload?.typeCounts || []
      if (assetPage.value > assetPageCount.value) {
        assetPage.value = assetPageCount.value
        await loadStaticAssets(quiet)
        return
      }
      assetError.value = ''
    } catch (err) {
      assetError.value = err instanceof Error ? err.message : String(err)
    } finally {
      assetLoading.value = false
    }
  }

  async function applyStaticAssetFilters() {
    assetPage.value = 1
    await loadStaticAssets()
  }

  async function resetStaticAssetFilters() {
    assetTypeFilter.value = ''
    assetScopeFilter.value = 'all'
    assetTaskIdFilter.value = ''
    assetKeywordFilter.value = ''
    assetPage.value = 1
    await loadStaticAssets()
  }

  async function setStaticAssetPage(page) {
    const next = Math.min(Math.max(1, page), assetPageCount.value)
    if (next === assetPage.value) return
    assetPage.value = next
    await loadStaticAssets()
  }

  async function openStaticAsset(asset) {
    const id = asset?.id
    if (!id) return
    selectedAssetLoading.value = true
    selectedAssetError.value = ''
    try {
      selectedAsset.value = await api.getStaticAsset(id)
    } catch (err) {
      selectedAssetError.value = err instanceof Error ? err.message : String(err)
    } finally {
      selectedAssetLoading.value = false
    }
  }

  function closeStaticAsset() {
    selectedAsset.value = null
    selectedAssetError.value = ''
  }

  async function uploadStaticAsset(file) {
    if (!file || uploadingAsset.value) return
    uploadingAsset.value = true
    assetError.value = ''
    try {
      const result = await api.uploadStaticAsset({
        type: uploadAssetType.value,
        taskId: uploadAssetTaskId.value.trim(),
        remark: uploadAssetRemark.value.trim(),
        file,
      })
      assetMessage.value = `已上传素材 #${result.id}`
      await loadStaticAssets()
      selectedAsset.value = result
    } catch (err) {
      assetError.value = err instanceof Error ? err.message : String(err)
    } finally {
      uploadingAsset.value = false
    }
  }

  async function createStaticTextAsset() {
    if (!textAssetContent.value.trim() || creatingTextAsset.value) return
    creatingTextAsset.value = true
    assetError.value = ''
    try {
      const result = await api.createStaticTextAsset({
        taskId: textAssetTaskId.value.trim(),
        type: 'text',
        content: textAssetContent.value,
        remark: textAssetRemark.value.trim(),
      })
      assetMessage.value = `已保存文本素材 #${result.id}`
      textAssetContent.value = ''
      await loadStaticAssets()
      selectedAsset.value = result
    } catch (err) {
      assetError.value = err instanceof Error ? err.message : String(err)
    } finally {
      creatingTextAsset.value = false
    }
  }

  function assetTypeLabel(type) {
    return STATIC_ASSET_TYPES.find(item => item.value === type)?.label || type || '-'
  }

  function assetContentKind(row) {
    const type = String(row?.type || '')
    if (type === 'text') return 'text'
    const content = String(row?.content || '')
    if (/^https?:\/\//i.test(content)) return 'url'
    return 'text'
  }

  return {
    assetRows,
    assetTotal,
    assetTypeCounts,
    assetLoading,
    assetError,
    assetMessage,
    assetTypeFilter,
    assetScopeFilter,
    assetTaskIdFilter,
    assetKeywordFilter,
    assetPage,
    assetPageCount,
    assetTypeSummary,
    selectedAsset,
    selectedAssetLoading,
    selectedAssetError,
    uploadAssetType,
    uploadAssetTaskId,
    uploadAssetRemark,
    uploadingAsset,
    textAssetTaskId,
    textAssetRemark,
    textAssetContent,
    creatingTextAsset,
    loadStaticAssets,
    applyStaticAssetFilters,
    resetStaticAssetFilters,
    setStaticAssetPage,
    openStaticAsset,
    closeStaticAsset,
    uploadStaticAsset,
    createStaticTextAsset,
    assetTypeLabel,
    assetContentKind,
  }
}
