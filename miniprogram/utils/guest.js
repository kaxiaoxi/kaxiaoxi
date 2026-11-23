const STORAGE_KEY = 'guest.session.v1'

function readStorage() {
  try {
    const value = wx.getStorageSync(STORAGE_KEY)
    return value && typeof value === 'object' ? value : null
  } catch (err) {
    console.warn('[guest] 读取本地访客数据失败', err)
    return null
  }
}

function defaultProfile() {
  return {
    name: '访客',
    college: '',
    dept: '',
    role: 'guest',
    status: 'guest',
    avatarText: '访',
    avatarColor: '#8A8A8E',
    isGuest: true,
    createdAt: Date.now()
  }
}

function apply(profile) {
  const app = getApp()
  if (app && app.globalData) {
    app.globalData.isGuest = true
    app.globalData.member = profile
  }
  return profile
}

function enter() {
  const existing = readStorage()
  const profile = existing || defaultProfile()
  try {
    wx.setStorageSync(STORAGE_KEY, profile)
  } catch (err) {
    console.warn('[guest] 写入本地访客数据失败', err)
  }
  return apply(profile)
}

function restore() {
  const profile = readStorage()
  if (!profile) return null
  return apply(profile)
}

function isGuest() {
  const app = getApp()
  return !!(app && app.globalData && app.globalData.isGuest)
}

function update(patch = {}) {
  const current = readStorage() || defaultProfile()
  const next = { ...current, ...patch, isGuest: true }
  try {
    wx.setStorageSync(STORAGE_KEY, next)
  } catch (err) {
    console.warn('[guest] 更新本地访客数据失败', err)
  }
  return apply(next)
}

function exit() {
  try {
    wx.removeStorageSync(STORAGE_KEY)
  } catch (err) {
    console.warn('[guest] 清除本地访客数据失败', err)
  }
  const app = getApp()
  if (app && app.globalData) {
    app.globalData.isGuest = false
    app.globalData.member = null
  }
}

module.exports = { enter, restore, isGuest, update, exit, STORAGE_KEY }
