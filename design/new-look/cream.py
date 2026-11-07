"""Turns the black look into the cream look (Ismael, 2026-11-04: "only the black details with white",
keep the pink). Every neutral colour flips its lightness, warmed a touch towards cream; every colour
with a hue (the sunset pink, success green, danger red) stays exactly as it was. Shadows stay dark
but softer. python3 cream.py file.css|file.html ... (rewrites in place)"""
import re
import sys

INK = (21, 19, 17)          # text on cream
CREAM = (246, 243, 238)     # the page


def warm(v):
    """A grey of lightness v (0 to 255), warmed: light ones lean cream, dark ones lean ink."""
    t = v / 255
    return round(INK[0] + (255 - INK[0]) * t), round(INK[1] + (253 - INK[1]) * t), round(INK[2] + (250 - INK[2]) * t)


def parse(c):
    c = c.strip()
    if c.startswith("#"):
        h = c[1:]
        if len(h) in (3, 4):
            h = "".join(x * 2 for x in h)
        r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
        a = int(h[6:8], 16) / 255 if len(h) == 8 else 1
        return r, g, b, a
    nums = [x.strip() for x in c[c.index("(") + 1:-1].split(",")]
    r, g, b = (int(float(x)) for x in nums[:3])
    a = float(nums[3]) if len(nums) > 3 else 1
    return r, g, b, a


def fmt(r, g, b, a):
    if a >= 1:
        return "#%02X%02X%02X" % (r, g, b)
    s = ("%.3f" % a).rstrip("0").rstrip(".")
    return f"rgba({r},{g},{b},{s.lstrip('0') if s.startswith('0.') else s})"


COLOR = re.compile(r"#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)")


def flip(c, prop):
    try:
        r, g, b, a = parse(c)
    except Exception:
        return c
    if max(r, g, b) - min(r, g, b) > 14:   # has a hue: keep it
        return c
    v = (r + g + b) / 3
    if "shadow" in prop and v < 128:       # a dark shadow stays a shadow, just softer
        return fmt(40, 30, 22, round(a * .45, 3))
    if "shadow" in prop and a < 1:         # a light highlight on glass stays light
        return c
    return fmt(*warm(255 - v), a)


def convert(css):
    out = []
    # declarations: prop: value up to ; or }
    pos = 0
    for m in re.finditer(r"([a-zA-Z0-9-]+)\s*:\s*([^;{}]*)", css):
        out.append(css[pos:m.start(2)])
        prop, val = m.group(1).lower(), m.group(2)
        out.append(COLOR.sub(lambda k: flip(k.group(0), prop), val))
        pos = m.end(2)
    out.append(css[pos:])
    return "".join(out)


for path in sys.argv[1:]:
    src = open(path).read()
    if path.endswith(".html"):
        src = re.sub(r"(<style[^>]*>)(.*?)(</style>)", lambda m: m.group(1) + convert(m.group(2)) + m.group(3), src, flags=re.S)
        src = re.sub(r'(<meta name="theme-color" content=")[^"]*', r"\1#F6F3EE", src)
    else:
        src = convert(src)
    open(path, "w").write(src)
    print("cream:", path)
