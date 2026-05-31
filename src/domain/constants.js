export const SUBMITTER_PAGE_SIZE = 20
export const MONITOR_PAGE_SIZE = 50
export const SPEECH_STAGE_KEY = 'speech'
export const SPEECH_STAGE_KEYS = ['whisper', 'translator', 'speaker']

export const SUBMITTER_FIXED_FIELDS = new Set(['thumbnail', 'title', 'duration', 'view_count'])

export const SUBMITTER_PREFERRED_FIELDS = [
  '__detail', 'import_status', 'import_error', 'import_author', 'import_index',
  'uploader', 'channel', 'channel_id', 'duration', 'view_count', 'like_count',
  'comment_count', 'webpage_url', 'id', 'upload_date', 'release_timestamp',
  'timestamp', 'language', 'fps', 'categories', 'tags', 'description',
  'automatic_captions', 'subtitles', 'formats', 'requested_formats',
]

export const SUBMITTER_COMMON_FIELDS = new Set([
  'import_status', 'import_error', 'import_author', 'import_index',
  'uploader', 'duration', 'view_count', 'like_count', 'comment_count',
  'language', 'fps', 'categories', 'tags', 'description',
])

export const SUBMITTER_NUMERIC_FIELDS = new Set([
  'duration', 'view_count', 'like_count', 'comment_count', 'fps',
  'filesize', 'filesize_approx', 'timestamp', 'release_timestamp',
])

export const SUBMITTER_SORT_OPTIONS = [
  { value: 'updated_desc', label: '最近更新' },
  { value: 'view_desc', label: '播放量从高到低' },
  { value: 'view_asc', label: '播放量从低到高' },
  { value: 'like_desc', label: '点赞量从高到低' },
  { value: 'like_asc', label: '点赞量从低到高' },
]

export const SUBMITTER_UPLOAD_FILTERS = [
  { value: 'unuploaded', label: '未上传' },
  { value: 'uploaded', label: '已上传' },
  { value: 'rejected', label: '拒稿' },
  { value: 'all', label: '全部' },
]

export const SUBMITTER_DURATION_FILTERS = [
  { value: 'all', label: '全部时长' },
  { value: 'short', label: '短视频（0-120 秒）' },
  { value: 'medium', label: '中视频（121-1200 秒）' },
  { value: 'long', label: '长视频（1201 秒以上）' },
]

export const statusText = {
  pending: '未开始',
  ready: '排队中',
  running: '处理中',
  success: '成功',
  failed: '失败',
  skipped: '跳过',
}

export const taskStatusFilters = [
  { key: 'all', label: '全部' },
  { key: 'success', label: '成功' },
  { key: 'failed', label: '失败' },
  { key: 'running', label: '执行中' },
]

export const stageNameText = {
  downloader: 'Downloader',
  demucs: 'Demucs',
  whisper: 'Whisper',
  translator: 'Translator',
  speaker: 'Speaker',
  speech: 'Whisper & Translator & Speaker',
  combiner: 'Combiner',
  uploader: 'Uploader',
}

export const uploadPlatformText = {
  bilibili: 'B站',
  xiaohongshu: '小红书',
  douyin: '抖音',
  shipinhao: '视频号',
  kuaishou: '快手',
}

export function createPlatformIconUrls(baseUrl) {
  return {
    douyin: `${baseUrl}platform-icons/douyin-official-appstore-512.png`,
    xiaohongshu: `${baseUrl}platform-icons/xiaohongshu-official-appstore-512.png`,
    bilibili: `${baseUrl}platform-icons/bilibili-official-appstore-512.png`,
    shipinhao: `${baseUrl}platform-icons/wechat_channels-official-appstore-512.png`,
    kuaishou: `${baseUrl}platform-icons/kuaishou-official-appstore-512.png`,
  }
}

export function createAccountPlatforms(platformIconUrls) {
  return [
    { type: 'douyin', label: '抖音', iconUrl: platformIconUrls.douyin },
    { type: 'xiaohongshu', label: '小红书', iconUrl: platformIconUrls.xiaohongshu },
    { type: 'bilibili', label: 'B站', iconUrl: platformIconUrls.bilibili },
    { type: 'shipinhao', label: '视频号', iconUrl: platformIconUrls.shipinhao },
    { type: 'kuaishou', label: '快手', iconUrl: platformIconUrls.kuaishou },
  ]
}
