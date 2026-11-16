# 卡小西 · 高保真 UI（iOS 风格）

22 个页面的高保真界面稿，390×844（iPhone 14 逻辑尺寸），2x 导出。

## 文件

| 文件 | 说明 |
|---|---|
| `sheet.png` | 22 页总览（3360×10800，2x） |
| `screens/01.png` … `screens/22.png` | 单页，780×1688 |
| `index.html` | 可交互原型：浏览器打开后改 `?s=04` 看单页，不带参数默认 01 |
| `sheet.html` | 总览页，内嵌 22 个 iframe |
| `crop.py` | 从 `sheet.png` 裁出单页 |
| `kaxiaoxi.png` / `kaxiaoxi-t.png` | IP 素材（白底 / 透明底） |

## 设计语言

- **字体**：SF Pro / Segoe UI / 苹方 / 微软雅黑，标题字重 700、负字距
- **底色**：`#F2F2F7` 分组背景，白色卡片 16px 圆角 + 极轻投影
- **主色**：`#2E5F7E`（相机蓝压深），浅色 `rgba(46,95,126,.10)`
- **强调色**：二课用金 `#9A6B12`，成功 `#2C7A4B`，危险 `#B4392C`
- **控件**：分段控件、胶囊标签、inset 分组列表、毛玻璃导航与 TabBar

## 重新生成

```powershell
# 1. 渲染总览（2x）
chrome --headless=new --disable-gpu --hide-scrollbars `
  --window-size=1680,5400 --force-device-scale-factor=2 `
  --screenshot=sheet.png "file:///<绝对路径>/sheet.html"

# 2. 裁单页
python crop.py
```

## 与线框图的关系

`../wireframe/` 是灰度线框，讨论信息结构；本目录是高保真，讨论视觉与质感。
两者页面编号一一对应。
