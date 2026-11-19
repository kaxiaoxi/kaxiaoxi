const cache = {}

async function resolve(fileIDs = []) {
  const ids = [...new Set(fileIDs.filter((id) => id && !cache[id]))]
  if (!ids.length) return cache

  try {
    const res = await wx.cloud.getTempFileURL({ fileList: ids })
    ;(res.fileList || []).forEach((item) => {
      if (item.tempFileURL) cache[item.fileID] = item.tempFileURL
    })
  } catch (err) {
    console.warn('[avatar] 解析头像地址失败', err)
  }
  return cache
}

function urlOf(fileID) {
  return (fileID && cache[fileID]) || fileID || ''
}

async function withAvatarUrls(list = []) {
  await resolve(list.map((item) => item.avatarFileID).filter(Boolean))
  return list.map((item) => ({
    ...item,
    avatarUrl: item.avatarFileID ? urlOf(item.avatarFileID) : ''
  }))
}

function remember(fileID, url) {
  if (fileID && url) cache[fileID] = url
}

module.exports = { resolve, urlOf, withAvatarUrls, remember }
