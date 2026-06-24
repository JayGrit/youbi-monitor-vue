export function normalizeUploadPlatform(platform) {
  const normalized = String(platform || '').trim().toLowerCase()
  const aliases = {
    bili: 'bilibili',
    xhs: 'xiaohongshu',
    red: 'xiaohongshu',
    dy: 'douyin',
    sph: 'shipinhao',
    channels: 'shipinhao',
    wx_channels: 'shipinhao',
    wechat_channels: 'shipinhao',
    'weixin-channels': 'shipinhao',
    '视频号': 'shipinhao',
    ks: 'kuaishou',
    kwai: 'kuaishou',
    '快手': 'kuaishou',
    toutiao: 'jinritoutiao',
    tt: 'jinritoutiao',
    '今日头条': 'jinritoutiao',
    yt: 'youtube',
    '油管': 'youtube',
  }
  const canonical = aliases[normalized] || normalized
  const supported = new Set(['bilibili', 'douyin', 'xiaohongshu', 'shipinhao', 'kuaishou', 'jinritoutiao', 'youtube', 'x'])
  if (!supported.has(canonical)) return ''
  return canonical
}
