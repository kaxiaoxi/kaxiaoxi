const COVER_FILE_ID =
  'cloud://gdutpa-d4g3obr8ff2930036.6764-gdutpa-d4g3obr8ff2930036-1533139576/share/share-cover.png'

let cached = ''

/**
 * 分享卡片封面：用云端临时地址，避免部分机型上本地包内图片
 * 作为 imageUrl 时不显示；取不到时调用方回退本地图片。
 */
async function getShareCover() {
  if (cached) return cached
  try {
    const res = await wx.cloud.getTempFileURL({ fileList: [COVER_FILE_ID] })
    const item = (res.fileList || [])[0]
    if (item && item.tempFileURL) cached = item.tempFileURL
  } catch (err) {
    console.warn('[share] 封面地址获取失败，回退本地图', err)
  }
  return cached
}

module.exports = { getShareCover }
