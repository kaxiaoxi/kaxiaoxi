from PIL import Image
import os

base = r"C:\Users\31204\Documents\deepseek-harness\default-workspace\卡小西\design\ui"
sheet = Image.open(os.path.join(base, "sheet.png"))
S = 2
pad, gap, cw, ch, caph = 24, 24, 390, 844, 26
out = os.path.join(base, "screens")
os.makedirs(out, exist_ok=True)
for i in range(22):
    r, c = divmod(i, 4)
    x = (pad + c * (cw + gap)) * S
    y = (pad + r * (ch + caph + gap)) * S
    box = (x, y, x + cw * S, y + ch * S)
    sheet.crop(box).save(os.path.join(out, f"{i+1:02d}.png"), optimize=True)
print("cropped", len(os.listdir(out)))
