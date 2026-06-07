#!/bin/bash
# ============================================================
# build.sh — 将 src/ 合并为单文件 dist/index.html
# 用法: ./build.sh
# 输出: dist/index.html
# ============================================================
set -e
echo "🛠  Building dist/index.html ..."

python3 << 'PYEOF'
import os

SRC = "src"
DIST = "dist"
OUTPUT = os.path.join(DIST, "index.html")
os.makedirs(DIST, exist_ok=True)

# 1. 读取骨架
with open(os.path.join(SRC, "index.html"), "r") as f:
    content = f.read()

# 2. 内联 CSS
with open(os.path.join(SRC, "style.css"), "r") as f:
    css = f.read()
content = content.replace("/* style.css 会在构建时内联到这里 */", css)

# 3. JS 模块按依赖顺序拼接
js_order = [
    "config.js",
    "api.js",
    "channels/vv.js",
    "player.js",
    "ui.js",
    "app.js",
]

js_parts = []
for path in js_order:
    full_path = os.path.join(SRC, path)
    if os.path.exists(full_path):
        with open(full_path, "r") as f:
            js_parts.append(f.read())
        print(f"  ✓ {path}")
    else:
        print(f"  ⚠️  {path} not found, skipping")

joined_js = "\n\n".join(js_parts)
placeholder = "<!-- JS modules (构建时内联) -->"
content = content.replace(placeholder, "<script>\n" + joined_js + "\n</script>")

# 4. 写入
with open(OUTPUT, "w") as f:
    f.write(content)

size = os.path.getsize(OUTPUT)
print(f"\n✅  Done → {OUTPUT}  ({size} bytes)")
print(f"\n上传到 f.8tool.club 即可使用")
PYEOF
