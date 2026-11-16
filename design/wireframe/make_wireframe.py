# -*- coding: utf-8 -*-
"""卡小西 线框图生成器（Pillow 直接绘制，2x）"""
import os
from PIL import Image, ImageDraw, ImageFont

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, "screens")
os.makedirs(OUT, exist_ok=True)

W, H = 750, 1624
M = 32
CW = W - M * 2

INK = (28, 27, 26)
MUTED = (138, 133, 128)
LINE = (232, 228, 222)
BG = (250, 247, 242)
BLUE = (131, 167, 189)
BLUE_D = (55, 86, 104)
BLUE_L = (234, 241, 246)
YELLOW = (254, 231, 117)
YELLOW_L = (255, 249, 220)
PINK = (255, 225, 227)
GREEN = (47, 125, 84)
GREEN_L = (227, 243, 234)
RED = (179, 72, 72)
RED_L = (251, 230, 230)
GRAY_L = (242, 243, 245)

FONT_DIR = r"C:\Windows\Fonts"
def _font(name, size):
    for f in (name, "msyh.ttc", "msyhbd.ttc", "simsun.ttc"):
        p = os.path.join(FONT_DIR, f)
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()

_cache = {}
def F(size, bold=False):
    key = (size, bold)
    if key not in _cache:
        _cache[key] = _font("msyhbd.ttc" if bold else "msyh.ttc", size)
    return _cache[key]

def tw(d, s, size, bold=False):
    return d.textlength(s, font=F(size, bold))

def fit(d, s, size, maxw, bold=False):
    f = F(size, bold)
    if d.textlength(s, font=f) <= maxw:
        return s
    while s and d.textlength(s + "…", font=f) > maxw:
        s = s[:-1]
    return s + "…"

def wrap(d, s, size, maxw, bold=False):
    f = F(size, bold)
    lines, cur = [], ""
    for ch in s:
        if d.textlength(cur + ch, font=f) <= maxw:
            cur += ch
        else:
            lines.append(cur)
            cur = ch
    if cur:
        lines.append(cur)
    return lines

def rrect(d, box, r, fill=None, outline=None, width=2):
    d.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width)

def text(d, s, x, y, size, color=INK, bold=False, maxw=None):
    if maxw:
        s = fit(d, s, size, maxw, bold)
    d.text((x, y), s, font=F(size, bold), fill=color)
    return y + size + 6

def tag(d, x, y, s, bg=GRAY_L, fg=(107, 114, 128)):
    h = 40
    w = tw(d, s, 20, True) + 24
    rrect(d, (x, y, x + w, y + h), 10, fill=bg)
    d.text((x + 12, y + 8), s, font=F(20, True), fill=fg)
    return w, h

def btn(d, x, y, w, h, s, kind="default"):
    if kind == "primary":
        rrect(d, (x, y, x + w, y + h), 20, fill=BLUE)
        c = (255, 255, 255)
    elif kind == "ghost":
        rrect(d, (x, y, x + w, y + h), 20, fill=(255, 255, 255), outline=BLUE)
        c = BLUE_D
    elif kind == "disabled":
        rrect(d, (x, y, x + w, y + h), 20, fill=(241, 242, 244))
        c = (169, 177, 185)
    else:
        rrect(d, (x, y, x + w, y + h), 20, fill=(255, 255, 255), outline=LINE)
        c = INK
    f = F(26, True)
    d.text((x + (w - d.textlength(s, font=f)) / 2, y + (h - 34) / 2), s, font=f, fill=c)

def card(d, x, y, w, h, fill=(255, 255, 255), border=LINE, r=28):
    rrect(d, (x, y, x + w, y + h), r, fill=fill, outline=border if border else None)

def avatar(d, x, y, s, ch, color=BLUE):
    d.ellipse((x, y, x + s, y + s), fill=color)
    f = F(int(s * 0.42), True)
    d.text((x + (s - d.textlength(ch, font=f)) / 2, y + s * 0.26), ch, font=f, fill=(255, 255, 255))

def hline(d, x, y, w, color=LINE):
    d.line((x, y, x + w, y), fill=color, width=2)

def section(d, y, title, more=None):
    text(d, title, M, y, 32, INK, True)
    if more:
        mw = tw(d, more, 22)
        text(d, more, W - M - mw, y + 6, 22, MUTED)
    return y + 52

def frame(title="", back=False, tab=None):
    img = Image.new("RGB", (W, H), (255, 255, 255))
    d = ImageDraw.Draw(img)
    # status
    d.text((36, 28), "9:41", font=F(24, True), fill=(40, 40, 40))
    d.text((W - 168, 28), "5G", font=F(22, True), fill=(40, 40, 40))
    for i in range(3):
        d.rectangle((W - 126 + i * 12, 46 - (i + 1) * 5, W - 118 + i * 12, 48), fill=(40, 40, 40))
    d.rounded_rectangle((W - 92, 30, W - 48, 48), radius=4, outline=(40, 40, 40), width=2)
    d.rectangle((W - 52, 35, W - 48, 43), fill=(40, 40, 40))
    if title:
        hline(d, 0, 176, W)
        f = F(32, True)
        d.text(((W - d.textlength(title, font=f)) / 2, 108), title, font=f, fill=INK)
        if back:
            d.text((34, 100), "‹", font=F(44), fill=(40, 40, 40))
    return img, d

def _icon(d, i, cx, cy, c):
    if i == 0:   # home
        d.polygon([(cx - 12, cy - 1), (cx, cy - 13), (cx + 12, cy - 1)], fill=c)
        d.rectangle((cx - 8, cy - 1, cx + 8, cy + 11), fill=c)
    elif i == 1: # list
        for k in range(3):
            y = cy - 9 + k * 9
            d.rectangle((cx - 12, y, cx - 9, y + 3), fill=c)
            d.rectangle((cx - 5, y, cx + 12, y + 3), fill=c)
    elif i == 2: # calendar
        d.rounded_rectangle((cx - 12, cy - 10, cx + 12, cy + 11), radius=3, outline=c, width=3)
        d.line((cx - 12, cy - 3, cx + 12, cy - 3), fill=c, width=3)
        d.rectangle((cx - 4, cy + 2, cx + 6, cy + 7), fill=c)
    else:        # user
        d.ellipse((cx - 6, cy - 13, cx + 6, cy - 1), fill=c)
        d.pieslice((cx - 12, cy - 1, cx + 12, cy + 21), 180, 360, fill=c)

def tabbar(d, idx):
    top = H - 108
    hline(d, 0, top, W)
    names = ["首页", "任务", "年历", "我的"]
    for i in range(4):
        cx = W / 8 + i * W / 4
        c = BLUE_D if i == idx else (154, 160, 166)
        _icon(d, i, cx, top + 34, c)
        f = F(20, i == idx)
        d.text((cx - d.textlength(names[i], font=f) / 2, top + 74), names[i], font=f, fill=c)

def save(img, name):
    img.save(os.path.join(OUT, name), optimize=True)

IP = Image.open(os.path.join(BASE, "kaxiaoxi.png")).convert("RGB")
def ip(d, x, y, s):
    im = IP.copy()
    im.thumbnail((s, s), Image.LANCZOS)
    d._image.paste(im, (int(x + (s - im.width) / 2), int(y + (s - im.height) / 2)))

# ---------------------------------------------------------------- 01 boot
def s01():
    img, d = frame("", tab=None)
    d._image = img
    ip(d, W/2 - 120, 300, 240)
    f = F(48, True); s = "卡小西"
    d.text(((W - d.textlength(s, font=f)) / 2, 590), s, font=f, fill=INK)
    f = F(24); s = "广工影协指南 · 内部版"
    d.text(((W - d.textlength(s, font=f)) / 2, 660), s, font=f, fill=MUTED)
    btn(d, M + 16, 900, CW - 32, 84, "微信一键登录", "primary")
    f = F(20); s = "登录即表示同意《用户协议》《隐私政策》"
    d.text(((W - d.textlength(s, font=f)) / 2, 1010), s, font=f, fill=MUTED)
    save(img, "01-boot.png")

# ---------------------------------------------------------------- 02 register
def s02():
    img, d = frame("注册", back=True)
    y = 210
    y = text(d, "完善资料", M, y, 40, INK, True) + 6
    y = text(d, "提交后由主席审核，通过即可使用", M, y, 22, MUTED) + 18
    fields = [("姓名", "张三", None), ("学号（唯一）", "3124001234", None),
              ("学院", "请选择 ›", "muted"), ("手机号", "138 0013 8000", None),
              ("宿舍号", "东一636", "hint"), ("部门", "摄影师队 ›", "muted")]
    for lab, val, kind in fields:
        y = text(d, lab, M, y, 22, (75, 85, 99), True) + 6
        card(d, M, y, CW, 76, fill=(251, 251, 252))
        text(d, val, M + 20, y + 22, 24, MUTED if kind == "muted" else (51, 51, 51), maxw=CW - 40)
        y += 88
        if kind == "hint":
            y = text(d, "格式：东/西 + 楼号 + 房号", M, y, 20, MUTED) + 4
    btn(d, M, H - 140, CW, 84, "提交申请", "primary")
    save(img, "02-register.png")

# ---------------------------------------------------------------- 03 pending
def s03():
    img, d = frame("入会申请", back=True)
    d._image = img
    ip(d, W/2 - 100, 300, 200)
    f = F(34, True); s = "申请已提交"
    d.text(((W - d.textlength(s, font=f)) / 2, 560), s, font=f, fill=INK)
    f = F(24)
    for i, s in enumerate(["主席审核通过后会通知你", "一般 1～2 天"]):
        d.text(((W - d.textlength(s, font=f)) / 2, 620 + i * 40), s, font=f, fill=MUTED)
    btn(d, M + 16, 760, CW - 32, 76, "联系主席", "ghost")
    save(img, "03-pending.png")

# ---------------------------------------------------------------- 04 home
def s04():
    img, d = frame("卡小西")
    y = 200
    text(d, "早上好，张三", M, y, 40, INK, True)
    text(d, "摄影师队 · 小干", M, y + 56, 22, MUTED)
    avatar(d, W - M - 72, y, 72, "张", (131, 167, 189))
    y += 120

    # publish card
    card(d, M, y, CW, 150, fill=BLUE_L, border=None)
    text(d, "发布", M + 24, y + 20, 30, INK, True)
    text(d, "搬砖 / 部门待办 / 年历日程", M + 120, y + 30, 20, MUTED)
    widths = (CW - 48 - 20) / 3
    for i, s in enumerate(["＋ 搬砖", "＋ 待办", "＋ 日程"]):
        btn(d, M + 24 + i * (widths + 10), y + 78, widths, 54, s, "ghost")
    y += 170

    y = section(d, y, "近期任务", "全部 ›")
    # task 1
    card(d, M, y, CW, 228)
    w, _ = tag(d, M + 20, y + 18, "报名中", BLUE_L, BLUE_D)
    text(d, "剩 2 天截止", M + 40 + w, y + 24, 20, MUTED)
    text(d, "中心湖人像外拍", M + 20, y + 72, 28, INK, True, maxw=480)
    text(d, "11-21 09:00 · 大学城中心湖", M + 20, y + 112, 20, MUTED, maxw=480)
    rrect(d, (W - M - 120, y + 60, W - M - 20, y + 180), 18, fill=(237, 240, 243))
    tag(d, M + 20, y + 166, "4/6 人 · 候补 2")
    tag(d, M + 250, y + 166, "二课 4 学时", YELLOW, (107, 90, 0))
    y += 248

    card(d, M, y, CW, 228)
    w, _ = tag(d, M + 20, y + 18, "进行中", GREEN_L, GREEN)
    text(d, "今天 09:00", M + 40 + w, y + 24, 20, MUTED)
    text(d, "迎新晚会拍摄", M + 20, y + 72, 28, INK, True, maxw=480)
    text(d, "11-16 09:00 · 体育馆", M + 20, y + 112, 20, MUTED, maxw=480)
    rrect(d, (W - M - 120, y + 60, W - M - 20, y + 180), 18, fill=(237, 240, 243))
    tag(d, M + 20, y + 166, "6/6 人")
    tag(d, M + 200, y + 166, "二课 8 学时", YELLOW, (107, 90, 0))
    y += 248

    y = section(d, y, "我的待办", "全部 ›")
    card(d, M, y, CW, 180)
    d.rectangle((M + 16, y + 24, M + 22, y + 84), fill=(217, 108, 108))
    text(d, "收齐迎新照片", M + 36, y + 22, 26, INK, True)
    text(d, "今天截止", M + 36, y + 62, 20, MUTED)
    tag(d, W - M - 60, y + 22, "高", RED_L, RED)
    hline(d, M + 16, y + 100, CW - 32, (243, 241, 237))
    d.rectangle((M + 16, y + 118, M + 22, y + 168), fill=(224, 169, 63))
    text(d, "确认周六外拍名单", M + 36, y + 116, 26, INK, True)
    text(d, "11-19 截止", M + 36, y + 156, 20, MUTED)
    tabbar(d, 0)
    save(img, "04-home.png")

# ---------------------------------------------------------------- 05 list
def s05():
    img, d = frame("任务")
    y = 200
    # segmented
    rrect(d, (M, y, W - M, y + 68), 18, fill=GRAY_L)
    segs = ["全部", "本部门", "我参与的"]
    sw = (CW - 12) / 3
    rrect(d, (M + 6, y + 6, M + 6 + sw, y + 62), 14, fill=(255, 255, 255))
    for i, s in enumerate(segs):
        f = F(24, i == 0)
        d.text((M + 6 + i * sw + (sw - d.textlength(s, font=f)) / 2, y + 20), s, font=f,
               fill=INK if i == 0 else (107, 114, 128))
    y += 88
    x = M
    for i, s in enumerate(["报名中", "未开始", "已结束", "我发布的"]):
        w, _ = tag(d, x, y, s, BLUE if i == 0 else None, (255, 255, 255) if i == 0 else (107, 114, 128))
        x += w + 12
    y += 64

    def card_task(y, status, st_bg, st_fg, deadline, title, meta, foot_l, foot_r, btn_kind, btn_txt):
        h = 300
        card(d, M, y, CW, h)
        w, _ = tag(d, M + 20, y + 18, status, st_bg, st_fg)
        text(d, deadline, W - M - 20 - tw(d, deadline, 20), y + 24, 20, MUTED)
        text(d, title, M + 20, y + 72, 30, INK, True, maxw=CW - 40)
        text(d, meta, M + 20, y + 118, 20, MUTED, maxw=CW - 40)
        for i, ch in enumerate("李王陈"):
            avatar(d, M + 20 + i * 44, y + 160, 36, ch, [(131,167,189),(183,166,201),(157,191,174)][i])
        text(d, foot_l, M + 168, y + 166, 20, MUTED)
        tag(d, W - M - 130, y + 160, "二课 4", YELLOW, (107, 90, 0))
        text(d, foot_r, M + 20, y + 236, 20, MUTED)
        btn(d, W - M - 170, y + 226, 150, 56, btn_txt, btn_kind)
        return y + h + 20

    y = card_task(y, "报名中", BLUE_L, BLUE_D, "11-19 20:00 截止", "中心湖人像外拍",
                  "11-21 ~ 11-22 · 两场 · 大学城中心湖", "4/6 人，可候补", "", "primary", "去报名")
    y = card_task(y, "未开始", GRAY_L, (107, 114, 128), "11-18 20:00 开抢", "宣传部招新海报拍摄",
                  "11-20 14:00 · 教学楼 A 栋", "1/3 人 · 仅宣传部", "", "disabled", "未开放")
    card_task(y, "已结束", GREEN_L, GREEN, "11-10", "毕业照帮拍",
              "11-10 15:00 · 图书馆前", "5/5 人", "", "default", "查看")
    tabbar(d, 1)
    save(img, "05-task-list.png")

# ---------------------------------------------------------------- 06 detail
def s06():
    img, d = frame("任务详情", back=True)
    y = 176
    rrect(d, (0, y, W, y + 300), 0, fill=(237, 240, 243))
    s = "活动封面"
    d.text(((W - d.textlength(s, font=F(24))) / 2, y + 138), s, font=F(24), fill=(169, 177, 185))
    y += 320
    w, _ = tag(d, M, y, "报名中", BLUE_L, BLUE_D)
    text(d, "11-19 20:00 截止", W - M - tw(d, "11-19 20:00 截止", 20), y + 8, 20, MUTED)
    y += 60
    text(d, "中心湖人像外拍", M, y, 40, INK, True)
    y += 64
    x = M
    for s, bg, fg in [("二课 4 学时", YELLOW, (107, 90, 0)), ("面向全体", GRAY_L, (107, 114, 128)),
                      ("审核制", PINK, (156, 74, 87))]:
        w, _ = tag(d, x, y, s, bg, fg)
        x += w + 10
    y += 70
    card(d, M, y, CW, 330)
    kv = [("场次", "11-21 周六 09:00–12:00\n11-22 周日 09:00–12:00"),
          ("地点", "大学城中心湖（点击导航）"),
          ("人数", "4 / 6 人，候补 2 人"),
          ("收图", "上传群相册，命名「姓名-序号」")]
    yy = y + 24
    for k, v in kv:
        text(d, k, M + 24, yy, 22, MUTED)
        lines = v.split("\n")
        yy2 = yy
        for ln in lines:
            text(d, ln, M + 130, yy2, 22, (51, 51, 51), maxw=CW - 160)
            yy2 += 32
        yy = yy2 + 12
    y += 350
    y = section(d, y, "已报名 4 人", "全部 ›")
    for i, ch in enumerate("李王陈赵"):
        avatar(d, M + i * 52, y, 44, ch, [(131,167,189),(183,166,201),(157,191,174),(217,176,140)][i])
    # bottom bar
    hline(d, 0, H - 140, W)
    btn(d, M, H - 116, 220, 76, "开启提醒", "ghost")
    btn(d, M + 240, H - 116, CW - 240, 76, "报名（剩 2 个名额）", "primary")
    save(img, "06-task-detail.png")

# ---------------------------------------------------------------- 07 publish picker
def s07():
    img, d = frame("发布", back=True)
    y = 210
    text(d, "发布什么？", M, y, 40, INK, True); y += 62
    text(d, "选一个类型，后面填对应表单", M, y, 22, MUTED); y += 56
    opts = [("拍", "搬砖（拍摄任务）", "发活动、招人、记二课"),
            ("办", "部门待办", "给本部门派活，可设重要性"),
            ("历", "年历日程", "招新、例会、比赛等，进年历")]
    for ic, t, sub in opts:
        card(d, M, y, CW, 150)
        rrect(d, (M + 24, y + 40, M + 112, y + 128), 24, fill=BLUE_L)
        f = F(40, True)
        d.text((M + 68 - d.textlength(ic, font=f) / 2, y + 62), ic, font=f, fill=BLUE_D)
        text(d, t, M + 136, y + 38, 28, INK, True)
        text(d, sub, M + 136, y + 82, 20, MUTED)
        d.text((W - M - 40, y + 60), "›", font=F(40), fill=(196, 203, 211))
        y += 170
    card(d, M, y + 10, CW, 90, fill=BG, border=None)
    text(d, "个人待办在「我的 → 待办」里新建，不进这个入口。", M + 20, y + 34, 20, MUTED, maxw=CW - 40)
    save(img, "07-publish-picker.png")

# ---------------------------------------------------------------- 08 publish form
def s08():
    img, d = frame("发布搬砖", back=True)
    y = 204
    def field(lab, val, hint=None):
        nonlocal y
        text(d, lab, M, y, 22, (75, 85, 99), True); y += 34
        card(d, M, y, CW, 76, fill=(251, 251, 252))
        text(d, val, M + 20, y + 22, 24, (51, 51, 51), maxw=CW - 40)
        y += 88
        if hint:
            text(d, hint, M, y - 8, 20, MUTED); y += 26
    field("活动名称", "中心湖人像外拍")
    field("场次 1", "11-21 周六 09:00 – 12:00")
    field("场次 2", "11-22 周日 09:00 – 12:00", "＋ 添加场次")
    y += 48
    # two columns
    card(d, M, y, 380, 76, fill=(251, 251, 252)); text(d, "中心湖", M + 20, y + 22, 24, (51,51,51))
    card(d, M + 400, y, CW - 400, 76, fill=(251, 251, 252)); text(d, "不限", M + 420, y + 22, 24, (51,51,51))
    text(d, "地点", M, y - 30, 22, (75,85,99), True); text(d, "人数", M + 400, y - 30, 22, (75,85,99), True)
    y += 96
    card(d, M, y, 330, 76, fill=(251,251,252)); text(d, "立即", M + 20, y + 22, 24, (51,51,51))
    card(d, M + 350, y, CW - 350, 76, fill=(251,251,252)); text(d, "11-19 20:00", M + 370, y + 22, 24, (51,51,51))
    text(d, "报名开始", M, y - 30, 22, (75,85,99), True); text(d, "报名截止", M + 350, y - 30, 22, (75,85,99), True)
    y += 96
    card(d, M, y, 280, 76, fill=(251,251,252)); text(d, "4", M + 20, y + 22, 24, (51,51,51))
    card(d, M + 300, y, CW - 300, 76, fill=(251,251,252)); text(d, "审核制 ›", M + 320, y + 22, 24, (51,51,51))
    text(d, "二课学时", M, y - 30, 22, (75,85,99), True); text(d, "报名方式", M + 300, y - 30, 22, (75,85,99), True)
    y += 100
    field("收图方式", "上传群相册，命名「姓名-序号」")
    text(d, "附件（jpg/png/pdf，默认 30 天过期）", M, y, 22, (75,85,99), True); y += 38
    for i, s in enumerate(["脚本", "参考", "＋"]):
        rrect(d, (M + i * 92, y, M + i * 92 + 80, y + 80), 16, fill=(237, 240, 243))
        d.text((M + i * 92 + 20, y + 26), s, font=F(20), fill=(120, 128, 136))
    btn(d, M, H - 140, CW, 84, "发布", "primary")
    save(img, "08-publish-form.png")

# ---------------------------------------------------------------- 09 manage
def s09():
    img, d = frame("报名管理", back=True)
    y = 200
    rrect(d, (M, y, W - M, y + 68), 18, fill=GRAY_L)
    segs = ["待审 2", "已通过 4", "候补 2", "请假 1"]
    sw = (CW - 12) / 4
    rrect(d, (M + 6, y + 6, M + 6 + sw, y + 62), 14, fill=(255, 255, 255))
    for i, s in enumerate(segs):
        f = F(21, i == 0)
        d.text((M + 6 + i * sw + (sw - d.textlength(s, font=f)) / 2, y + 20), s, font=f,
               fill=INK if i == 0 else (107, 114, 128))
    y += 88
    text(d, "审核通过后若名额已满，自动进候补。", M, y, 20, MUTED); y += 44

    for name, dept, note, color in [
        ("李四", "摄影师队 · 3124001235", "备注：带 24-70，可拍夜景", (131,167,189)),
        ("王五", "宣传部 · 3124001240", "备注：第一次参加，想跟拍学习", (183,166,201))]:
        card(d, M, y, CW, 236)
        avatar(d, M + 20, y + 20, 60, name[0], color)
        text(d, name, M + 96, y + 24, 26, INK, True)
        text(d, dept, M + 96, y + 60, 20, MUTED)
        tag(d, W - M - 80, y + 22, "待审", BLUE_L, BLUE_D)
        text(d, note, M + 20, y + 104, 21, (90, 96, 102), maxw=CW - 40)
        btn(d, M + 20, y + 156, (CW - 50) / 2, 56, "拒绝")
        btn(d, M + 30 + (CW - 50) / 2, y + 156, (CW - 50) / 2, 56, "通过", "primary")
        y += 256

    y = section(d, y, "已通过（4）", "移除")
    card(d, M, y, CW, 168)
    for i, (n, ph, c) in enumerate([("陈六", "138****8002", (157,191,174)), ("赵七", "138****8003", (217,176,140))]):
        yy = y + 16 + i * 72
        avatar(d, M + 20, yy, 48, n[0], c)
        text(d, n, M + 84, yy + 2, 24, INK, True)
        text(d, ph, M + 84, yy + 34, 20, MUTED)
        tag(d, W - M - 96, yy + 8, "已通过", GREEN_L, GREEN)
        if i == 0:
            hline(d, M + 20, y + 80, CW - 40, (243, 241, 237))
    save(img, "09-manage.png")

# ---------------------------------------------------------------- 10 my signups
def s10():
    img, d = frame("我的报名", back=True)
    y = 200
    rrect(d, (M, y, W - M, y + 68), 18, fill=GRAY_L)
    for i, s in enumerate(["进行中", "已结束", "已取消"]):
        sw = (CW - 12) / 3
        if i == 0:
            rrect(d, (M + 6, y + 6, M + 6 + sw, y + 62), 14, fill=(255, 255, 255))
        f = F(24, i == 0)
        d.text((M + 6 + i * sw + (sw - d.textlength(s, font=f)) / 2, y + 20), s, font=f,
               fill=INK if i == 0 else (107, 114, 128))
    y += 92

    card(d, M, y, CW, 264)
    tag(d, M + 20, y + 18, "已通过", GREEN_L, GREEN)
    text(d, "11-21 09:00", W - M - 20 - tw(d, "11-21 09:00", 20), y + 24, 20, MUTED)
    text(d, "中心湖人像外拍", M + 20, y + 70, 28, INK, True)
    text(d, "大学城中心湖 · 第 2 场 11-22", M + 20, y + 112, 20, MUTED)
    btn(d, M + 20, y + 168, (CW - 50) / 2, 56, "请假", "ghost")
    btn(d, M + 30 + (CW - 50) / 2, y + 168, (CW - 50) / 2, 56, "取消报名")
    y += 284

    card(d, M, y, CW, 210)
    tag(d, M + 20, y + 18, "候补中 · 第 2 位", YELLOW, (107, 90, 0))
    text(d, "宣传部招新海报拍摄", M + 20, y + 70, 26, INK, True, maxw=CW - 40)
    text(d, "教学楼 A 栋", M + 20, y + 108, 20, MUTED)
    btn(d, M + 20, y + 140, CW - 40, 52, "取消候补")
    y += 230

    card(d, M, y, CW, 150)
    tag(d, M + 20, y + 18, "待审核", BLUE_L, BLUE_D)
    text(d, "迎新晚会拍摄", M + 20, y + 66, 26, INK, True)
    text(d, "体育馆", M + 20, y + 104, 20, MUTED)
    save(img, "10-my-signups.png")

# ---------------------------------------------------------------- 11 calendar
def s11():
    img, d = frame("年历")
    y = 200
    text(d, "2026 年 11 月", M, y, 34, INK, True)
    text(d, "‹ 今天 ›", W - M - 96, y + 8, 20, MUTED)
    y += 60
    days = ["一", "二", "三", "四", "五", "六", "日"]
    colw = CW / 7
    for i, s in enumerate(days):
        d.text((M + i * colw + (colw - d.textlength(s, font=F(20))) / 2, y), s, font=F(20), fill=MUTED)
    y += 40
    rows = [["26","27","28","29","30","31","1"],[2,3,4,5,6,7,8],[9,10,11,12,13,14,15],
            [16,17,18,19,20,21,22],[23,24,25,26,27,28,29],[30,None,None,None,None,None,None]]
    for r in rows:
        for i, v in enumerate(r):
            if v is None: continue
            cx = M + i * colw
            is_16 = (v == 16 and len(rows) > 0)
            if is_16:
                rrect(d, (cx + 8, y + 4, cx + colw - 12, y + 60), 16, fill=BLUE)
                c = (255, 255, 255)
            else:
                c = (201, 207, 214) if isinstance(v, str) else (75, 85, 99)
            s = str(v)
            d.text((cx + (colw - d.textlength(s, font=F(22))) / 2, y + 14), s, font=F(22), fill=c)
            if v in (16, 21, 22):
                dotc = (255, 255, 255) if v == 16 else YELLOW
                d.ellipse((cx + colw / 2 - 4, y + 48, cx + colw / 2 + 4, y + 56), fill=dotc)
        y += 66
    hline(d, M, y + 6, CW, LINE)
    y += 30
    y = section(d, y, "11 月 16 日 · 周一", "＋ 新建")
    card(d, M, y, CW, 150)
    tag(d, M + 20, y + 18, "外拍", YELLOW, (107, 90, 0))
    text(d, "09:00–12:00", W - M - 20 - tw(d, "09:00–12:00", 20), y + 24, 20, MUTED)
    text(d, "中心湖人像外拍", M + 20, y + 70, 26, INK, True)
    text(d, "关联任务 · 可去报名", M + 20, y + 110, 20, MUTED)
    y += 170
    card(d, M, y, CW, 130)
    tag(d, M + 20, y + 18, "例会", BLUE_L, BLUE_D)
    text(d, "19:00", W - M - 20 - tw(d, "19:00", 20), y + 24, 20, MUTED)
    text(d, "十一月全体例会", M + 20, y + 72, 26, INK, True)
    text(d, "教三 201", M + 20, y + 108, 20, MUTED)
    tabbar(d, 2)
    save(img, "11-calendar.png")

# ---------------------------------------------------------------- 12 event detail
def s12():
    img, d = frame("事件详情", back=True)
    y = 176
    rrect(d, (0, y, W, y + 260), 0, fill=(237, 240, 243))
    s = "活动海报"
    d.text(((W - d.textlength(s, font=F(24))) / 2, y + 118), s, font=F(24), fill=(169, 177, 185))
    y += 290
    text(d, "十一月全体例会", M, y, 38, INK, True); y += 60
    x = M
    w, _ = tag(d, x, y, "例会", BLUE_L, BLUE_D); x += w + 10
    tag(d, x, y, "全员", YELLOW, (107, 90, 0))
    y += 70
    card(d, M, y, CW, 280)
    kv = [("时间", "11-16 周一 19:00 – 21:00"), ("地点", "教三 201"),
          ("说明", "总结上月外拍，安排迎新晚会分工。"), ("创建", "主席 · 11-10")]
    yy = y + 24
    for k, v in kv:
        text(d, k, M + 24, yy, 22, MUTED)
        text(d, v, M + 120, yy, 22, (51, 51, 51), maxw=CW - 160)
        yy += 60
    y += 300
    card(d, M, y, CW, 80, fill=BG, border=None)
    text(d, "没有关联任务，不产生二课。", M + 20, y + 26, 20, MUTED)
    btn(d, M, H - 130, CW, 76, "加入手机日历", "ghost")
    save(img, "12-event-detail.png")

# ---------------------------------------------------------------- 13 event edit
def s13():
    img, d = frame("新建日程", back=True)
    y = 204
    def f1(lab, val):
        nonlocal y
        text(d, lab, M, y, 22, (75, 85, 99), True); y += 34
        card(d, M, y, CW, 76, fill=(251, 251, 252))
        text(d, val, M + 20, y + 22, 24, (51, 51, 51))
        y += 96
    f1("事件名称", "十一月全体例会")
    f1("类型", "例会 ›")
    card(d, M, y, 330, 76, fill=(251,251,252)); text(d, "11-16", M + 20, y + 22, 24, (51,51,51))
    card(d, M + 350, y, CW - 350, 76, fill=(251,251,252)); text(d, "19:00–21:00", M + 370, y + 22, 24, (51,51,51))
    text(d, "日期", M, y - 30, 22, (75,85,99), True); text(d, "时间", M + 350, y - 30, 22, (75,85,99), True)
    y += 96
    card(d, M, y, CW, 70, fill=BG, border=None)
    text(d, "全天", M + 20, y + 20, 24, (51,51,51))
    tag(d, W - M - 76, y + 15, "关", GRAY_L, (107,114,128))
    y += 92
    f1("地点", "教三 201")
    text(d, "说明", M, y, 22, (75, 85, 99), True); y += 34
    card(d, M, y, CW, 140, fill=(251, 251, 252))
    text(d, "总结上月外拍，安排迎新晚会分工。", M + 20, y + 22, 22, (51, 51, 51), maxw=CW - 40)
    y += 160
    f1("关联任务（可选）", "不关联 ›")
    btn(d, M, H - 140, CW, 84, "保存", "primary")
    save(img, "13-event-edit.png")

# ---------------------------------------------------------------- 14 todo list
def s14():
    img, d = frame("待办", back=True)
    y = 200
    rrect(d, (M, y, W - M, y + 68), 18, fill=GRAY_L)
    for i, s in enumerate(["我的", "部门", "已完成"]):
        sw = (CW - 12) / 3
        if i == 0:
            rrect(d, (M + 6, y + 6, M + 6 + sw, y + 62), 14, fill=(255, 255, 255))
        f = F(24, i == 0)
        d.text((M + 6 + i * sw + (sw - d.textlength(s, font=f)) / 2, y + 20), s, font=f,
               fill=INK if i == 0 else (107, 114, 128))
    y += 88
    x = M
    for i, s in enumerate(["全部", "高", "中", "低"]):
        w, _ = tag(d, x, y, s, BLUE if i == 0 else None, (255,255,255) if i == 0 else (107,114,128))
        x += w + 10
    y += 62

    items = [("高", (217,108,108), "收齐迎新照片", "今天 18:00 截止 · 宣传部", RED_L, RED),
             ("高", (217,108,108), "确认周六外拍名单", "11-19 截止 · 自动生成", RED_L, RED),
             ("中", (224,169,63), "登记中心湖二课", "11-24 截止 · 自动生成", YELLOW, (107,90,0)),
             ("低", (157,191,174), "整理器材清单", "无截止", GRAY_L, (107,114,128))]
    for pri, pc, t, sub, tbg, tfg in items:
        card(d, M, y, CW, 120)
        d.rectangle((M + 18, y + 20, M + 26, y + 80), fill=pc)
        text(d, t, M + 44, y + 20, 26, INK, True, maxw=CW - 160)
        text(d, sub, M + 44, y + 62, 20, MUTED, maxw=CW - 160)
        w, _ = tag(d, 0, 0, pri, tbg, tfg)
        tag(d, W - M - w - 20, y + 22, pri, tbg, tfg)
        y += 140

    y = section(d, y, "部门待办（本部门）", "＋ 新建")
    card(d, M, y, CW, 120)
    text(d, "本周收齐迎新照片", M + 20, y + 20, 26, INK, True)
    tag(d, W - M - 70, y + 18, "高", RED_L, RED)
    text(d, "负责人：部长 · 宣传部 · 11-18 截止", M + 20, y + 66, 20, MUTED)
    save(img, "14-todo-list.png")

# ---------------------------------------------------------------- 15 todo edit
def s15():
    img, d = frame("待办", back=True)
    y = 204
    def f1(lab, val, h=76):
        nonlocal y
        text(d, lab, M, y, 22, (75, 85, 99), True); y += 34
        card(d, M, y, CW, h, fill=(251, 251, 252))
        text(d, val, M + 20, y + 22, 24, (51, 51, 51), maxw=CW - 40)
        y += h + 20
    f1("标题", "收齐迎新照片")
    f1("描述", "每人交 10 张精修，按活动分文件夹。", 110)
    rrect(d, (M, y, W - M, y + 68), 18, fill=GRAY_L)
    sw = (CW - 12) / 2
    rrect(d, (M + 6 + sw, y + 6, M + 6 + sw * 2, y + 62), 14, fill=(255, 255, 255))
    for i, s in enumerate(["个人", "部门"]):
        f = F(24, i == 1)
        d.text((M + 6 + i * sw + (sw - d.textlength(s, font=f)) / 2, y + 20), s, font=f,
               fill=INK if i == 1 else (107, 114, 128))
    y += 88
    f1("部门", "宣传部 ›")
    f1("负责人", "李四（本部门）›")
    card(d, M, y, 330, 76, fill=(251,251,252)); text(d, "11-18 18:00", M + 20, y + 22, 24, (51,51,51))
    card(d, M + 350, y, CW - 350, 76, fill=(251,251,252)); text(d, "高 ›", M + 370, y + 22, 24, (51,51,51))
    text(d, "截止", M, y - 30, 22, (75,85,99), True); text(d, "重要性", M + 350, y - 30, 22, (75,85,99), True)
    y += 100
    card(d, M, y, CW, 90, fill=BG, border=None)
    text(d, "任务自动生成的待办会带「自动」标记，任务取消时自动作废。", M + 20, y + 24, 19, MUTED, maxw=CW - 40)
    btn(d, M, H - 140, CW, 84, "保存", "primary")
    save(img, "15-todo-edit.png")

# ---------------------------------------------------------------- 16 messages
def s16():
    img, d = frame("消息", back=True)
    y = 200
    text(d, "共 12 条 · 3 条未读", M, y, 20, MUTED)
    text(d, "全部已读", W - M - tw(d, "全部已读", 20), y, 20, BLUE_D)
    y += 50
    card(d, M, y, CW, 620)
    msgs = [("报", (131,167,189), "报名通过", "「中心湖外拍」已通过，11-21 09:00 见", "未读", True),
            ("递", (183,166,201), "候补转正", "有人请假，你已递补成功", "未读", True),
            ("假", (157,191,174), "请假已批准", "名额已转给候补同学", "未读", True),
            ("系", (217,176,140), "系统通知", "你已被设为宣传部部长", "11-10", False),
            ("任", (143,163,199), "任务已结束", "「迎新晚会」已自动结束，二课已计入", "11-09", False)]
    yy = y + 10
    for i, (ch, c, t, sub, right, unread) in enumerate(msgs):
        avatar(d, M + 20, yy + 14, 56, ch, c)
        text(d, t, M + 92, yy + 10, 25, INK, True)
        text(d, sub, M + 92, yy + 48, 20, MUTED, maxw=CW - 200)
        if unread:
            tag(d, W - M - 70, yy + 16, right, BLUE_L, BLUE_D)
        else:
            text(d, right, W - M - 20 - tw(d, right, 20), yy + 16, 20, MUTED)
        if i < len(msgs) - 1:
            hline(d, M + 20, yy + 104, CW - 40, (243, 241, 237))
        yy += 120
    save(img, "16-messages.png")

# ---------------------------------------------------------------- 17 mine
def s17():
    img, d = frame("我的")
    y = 200
    card(d, M, y, CW, 300, fill=BLUE_L, border=None)
    avatar(d, M + 24, y + 24, 88, "张", BLUE)
    text(d, "张三", M + 132, y + 34, 32, INK, True)
    text(d, "摄影师队 · 小干 · 2026-2027", M + 132, y + 80, 20, (90, 98, 106))
    d.text((W - M - 50, y + 40), "›", font=F(36), fill=(196, 203, 211))
    stats = [("12", "二课学时"), ("8", "参与活动"), ("3", "待办")]
    for i, (n, t) in enumerate(stats):
        x = M + 24 + i * ((CW - 48) / 3)
        rrect(d, (x, y + 150, x + (CW - 48) / 3 - 12, y + 270), 20, fill=(255, 255, 255, 255) if False else (255,255,255))
        f = F(34, True)
        d.text((x + ((CW - 48) / 3 - 12 - d.textlength(n, font=f)) / 2, y + 172), n, font=f, fill=BLUE_D)
        f2 = F(19)
        d.text((x + ((CW - 48) / 3 - 12 - d.textlength(t, font=f2)) / 2, y + 226), t, font=f2, fill=MUTED)
    y += 320

    def menu(y, items):
        card(d, M, y, CW, len(items) * 88)
        for i, (t, r, color) in enumerate(items):
            text(d, t, M + 24, y + 26 + i * 88, 26, INK)
            if r:
                if color:
                    tag(d, W - M - 90, y + 24 + i * 88, r, color[0], color[1])
                else:
                    text(d, r, W - M - 24 - tw(d, r, 20), y + 30 + i * 88, 20, MUTED)
            d.text((W - M - 36, y + 22 + i * 88), "›", font=F(32), fill=(196, 203, 211))
            if i < len(items) - 1:
                hline(d, M + 24, y + 76 + i * 88, CW - 48, (243, 241, 237))
        return y + len(items) * 88 + 20

    y = menu(y, [("我的报名", "", None), ("我的二课", "", None), ("我的待办", "", None), ("消息", "3", (RED_L, RED))])
    menu(y, [("成员管理", "主席可见", None), ("二课汇总", "部长/主席", None), ("设置", "", None), ("关于卡小西", "", None)])
    tabbar(d, 3)
    save(img, "17-mine.png")

# ---------------------------------------------------------------- 18 erke
def s18():
    img, d = frame("我的二课", back=True)
    y = 200
    card(d, M, y, CW, 260, fill=BLUE_L, border=None)
    text(d, "2026-2027 学年累计", M + 24, y + 24, 20, (90, 98, 106))
    text(d, "12", M + 24, y + 64, 76, BLUE_D, True)
    text(d, "学时", M + 120, y + 112, 22, (90, 98, 106))
    text(d, "共 5 场活动 · 数据实时计算，无需结算", M + 24, y + 176, 20, (90, 98, 106))
    y += 280
    y = section(d, y, "明细", "按学年 ›")
    card(d, M, y, CW, 300)
    rows = [("中心湖人像外拍", "11-21 · 4 学时", "已计入", GREEN_L, GREEN),
            ("迎新晚会拍摄", "11-16 · 8 学时", "已计入", GREEN_L, GREEN),
            ("宣传部招新海报", "11-20 · 2 学时", "未结束", GRAY_L, (107,114,128))]
    for i, (t, s1, tg, bg, fg) in enumerate(rows):
        yy = y + 20 + i * 96
        text(d, t, M + 24, yy, 25, INK, True)
        text(d, s1, M + 24, yy + 40, 20, MUTED)
        tag(d, W - M - 110, yy + 8, tg, bg, fg)
        if i < 2:
            hline(d, M + 24, y + 100 + i * 96, CW - 48, (243, 241, 237))
    y += 320
    card(d, M, y, CW, 90, fill=YELLOW_L, border=None)
    text(d, "活动到点自动结束，学时就计入；名单被移除会自动扣回。", M + 20, y + 26, 19, (120, 100, 40), maxw=CW - 40)
    save(img, "18-erke.png")

# ---------------------------------------------------------------- 19 members
def s19():
    img, d = frame("成员管理", back=True)
    y = 200
    card(d, M, y, CW, 76, fill=(251,252,252))
    d.ellipse((M + 24, y + 26, M + 42, y + 44), outline=MUTED, width=3)
    d.line((M + 40, y + 42, M + 48, y + 50), fill=MUTED, width=3)
    text(d, "搜索姓名 / 学号", M + 62, y + 22, 22, MUTED)
    y += 96
    text(d, "待审核 1", M, y, 30, INK, True)
    text(d, "2026-2027", W - M - tw(d, "2026-2027", 20), y + 8, 20, MUTED)
    y += 50
    card(d, M, y, CW, 210)
    avatar(d, M + 20, y + 20, 60, "王", (183,166,201))
    text(d, "王五", M + 96, y + 24, 26, INK, True)
    text(d, "宣传部 · 3124001240", M + 96, y + 60, 20, MUTED)
    tag(d, W - M - 80, y + 22, "待审", BLUE_L, BLUE_D)
    btn(d, M + 20, y + 132, (CW - 50) / 2, 56, "拒绝")
    btn(d, M + 30 + (CW - 50) / 2, y + 132, (CW - 50) / 2, 56, "通过", "primary")
    y += 236
    y = section(d, y, "在册 70 人", "按部门 ›")
    card(d, M, y, CW, 300)
    mem = [("李四", "摄影师队 · 3124001235", "部长", PINK, (156, 74, 87), (131,167,189)),
           ("陈六", "摄影师队 · 3124001236", "小干", GRAY_L, (107,114,128), (157,191,174)),
           ("赵七", "运营部 · 3124001237", "小干", GRAY_L, (107,114,128), (217,176,140))]
    for i, (n, sub, role, bg, fg, c) in enumerate(mem):
        yy = y + 18 + i * 88
        avatar(d, M + 20, yy, 52, n[0], c)
        text(d, n, M + 88, yy + 2, 25, INK, True)
        text(d, sub, M + 88, yy + 38, 20, MUTED)
        tag(d, W - M - 80, yy + 8, role, bg, fg)
        if i < 2:
            hline(d, M + 20, y + 84 + i * 88, CW - 40, (243, 241, 237))
    save(img, "19-members.png")

# ---------------------------------------------------------------- 20 erke summary
def s20():
    img, d = frame("二课汇总", back=True)
    y = 200
    text(d, "2026-2027 学年", M, y, 32, INK, True)
    w, _ = tag(d, W - M - 150, y + 4, "切换学年", BLUE_L, BLUE_D)
    y += 56
    text(d, "部长仅统计本部门发布任务的参与者", M, y, 19, MUTED, maxw=CW)
    y += 50
    # table header
    cols = [0, 180, 330, 470]
    header = ["姓名", "学号", "学院", "总时长"]
    hline(d, M, y, CW, LINE)
    for i, s in enumerate(header):
        d.text((M + cols[i], y + 14), s, font=F(19, True), fill=MUTED)
    y += 46
    rows = [("张三", "3124001234", "计算机", "12"), ("李四", "3124001235", "计算机", "16"),
            ("王五", "3124001240", "艺术设计", "8"), ("陈六", "3124001236", "自动化", "6"),
            ("赵七", "3124001237", "外国语", "4")]
    for i, r in enumerate(rows):
        for j, s in enumerate(r):
            if j == 3:
                f = F(22, True)
                d.text((W - M - d.textlength(s, font=f), y + 16), s, font=f, fill=BLUE_D)
            else:
                d.text((M + cols[j], y + 16), s, font=F(20), fill=(51, 51, 51))
        hline(d, M, y + 56, CW, (243, 241, 237))
        y += 58
    y += 20
    card(d, M, y, CW, 90, fill=BG, border=None)
    text(d, "导出列固定为：姓名、学号、学院、总时长。", M + 20, y + 28, 20, MUTED)
    btn(d, M, H - 140, CW, 84, "导出 CSV", "primary")
    save(img, "20-erke-summary.png")

# ---------------------------------------------------------------- 21 settings
def s21():
    img, d = frame("设置", back=True)
    y = 200
    y = section(d, y, "学年")
    card(d, M, y, CW, 120)
    text(d, "当前学年 2026-2027", M + 24, y + 22, 25, INK, True)
    text(d, "8 月 1 日为学年边界", M + 24, y + 62, 20, MUTED)
    btn(d, W - M - 190, y + 26, 166, 56, "开启新学年", "ghost")
    y += 140
    y = section(d, y, "部门")
    card(d, M, y, CW, 80)
    text(d, "摄影师队 / 宣传部 / 运营部", M + 24, y + 26, 22, (51,51,51))
    text(d, "管理 ›", W - M - 80, y + 26, 22, MUTED)
    y += 100
    y = section(d, y, "权限")
    card(d, M, y, CW, 264)
    rows = [("主席移交", "oX9…"), ("指定部长", ""), ("兜底管理员", "1 人")]
    for i, (t, r) in enumerate(rows):
        text(d, t, M + 24, y + 26 + i * 88, 25, INK)
        if r:
            text(d, r, W - M - 100, y + 30 + i * 88, 20, MUTED)
        d.text((W - M - 36, y + 22 + i * 88), "›", font=F(32), fill=(196, 203, 211))
        if i < 2:
            hline(d, M + 24, y + 76 + i * 88, CW - 48, (243, 241, 237))
    y += 284
    y = section(d, y, "其他")
    card(d, M, y, CW, 200)
    for i, (t, r) in enumerate([("隐私政策", ""), ("清除缓存", "2.3 MB"), ("版本", "1.0.0")]):
        text(d, t, M + 24, y + 24 + i * 66, 24, INK)
        if r:
            text(d, r, W - M - 130, y + 28 + i * 66, 20, MUTED)
        if i < 2:
            d.text((W - M - 36, y + 20 + i * 66), "›", font=F(30), fill=(196, 203, 211))
    save(img, "21-settings.png")

# ---------------------------------------------------------------- 22 success
def s22():
    img, d = frame("报名成功", back=True)
    d._image = img
    ip(d, W/2 - 90, 270, 180)
    f = F(40, True); s = "报名成功"
    d.text(((W - d.textlength(s, font=f)) / 2, 490), s, font=f, fill=INK)
    f = F(24)
    for i, s in enumerate(["「中心湖人像外拍」", "11-21 周六 09:00 · 中心湖"]):
        d.text(((W - d.textlength(s, font=f)) / 2, 552 + i * 44), s, font=f, fill=MUTED)
    btn(d, M + 16, 700, CW - 32, 84, "开启提醒（开始前 2 小时）", "primary")
    f = F(20); s = "微信只允许提醒一次，开启后到点推送"
    d.text(((W - d.textlength(s, font=f)) / 2, 806), s, font=f, fill=MUTED)
    btn(d, M + 16, 900, 310, 76, "查看详情")
    btn(d, M + 346, 900, 310, 76, "返回首页")
    save(img, "22-success.png")

for fn in [s01, s02, s03, s04, s05, s06, s07, s08, s09, s10, s11,
           s12, s13, s14, s15, s16, s17, s18, s19, s20, s21, s22]:
    fn()

# contact sheet 4x6
files = sorted(os.listdir(OUT))
captions = {
 "01-boot.png": "01 启动/登录", "02-register.png": "02 注册（6 项）", "03-pending.png": "03 等待审核",
 "04-home.png": "04 首页", "05-task-list.png": "05 任务列表", "06-task-detail.png": "06 任务详情",
 "07-publish-picker.png": "07 发布入口", "08-publish-form.png": "08 发布搬砖", "09-manage.png": "09 报名管理",
 "10-my-signups.png": "10 我的报名", "11-calendar.png": "11 年历月视图", "12-event-detail.png": "12 事件详情",
 "13-event-edit.png": "13 新建日程", "14-todo-list.png": "14 待办列表", "15-todo-edit.png": "15 待办编辑",
 "16-messages.png": "16 消息中心", "17-mine.png": "17 我的", "18-erke.png": "18 我的二课",
 "19-members.png": "19 成员管理", "20-erke-summary.png": "20 二课汇总", "21-settings.png": "21 设置",
 "22-success.png": "22 报名成功",
}
thw, thh = 375, 812
gap, pad, caph = 20, 40, 34
rows = 6
cols = 4
sheet = Image.new("RGB", (cols * thw + (cols + 1) * gap, rows * (thh + caph) + (rows + 1) * gap), (233, 237, 242))
dd = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    if i >= rows * cols:
        break
    r, c = divmod(i, cols)
    x = gap + c * (thw + gap)
    y = gap + r * (thh + caph + gap)
    im = Image.open(os.path.join(OUT, f)).resize((thw, thh), Image.LANCZOS)
    dd.rounded_rectangle((x - 1, y - 1, x + thw + 1, y + thh + 1), radius=14, fill=(255, 255, 255))
    sheet.paste(im, (x, y))
    cap = captions.get(f, f)
    dd.text((x + 4, y + thh + 8), cap, font=F(18, True), fill=(70, 78, 88))
sheet.save(os.path.join(BASE, "contact-sheet.png"), optimize=True)
print("done", len(files), "screens; sheet", sheet.size)
