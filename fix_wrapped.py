import re

def wrap_async(content):
    # Find addEventListener('...', async (...) => { ... })
    # and replace with addEventListener('...', (...) => void (async (...) => { ... })())
    pattern = r"addEventListener\('([^']+)',\s+async\s*\(([^)]*)\)\s*=>\s*\{"
    replacement = r"addEventListener('\1', (\2) => void (async () => {"
    content = re.sub(pattern, replacement, content)
    return content

for path in ['src/components/app.ts', 'src/components/gist-detail.ts', 'src/components/gist-card.ts', 'src/components/gist-edit.ts']:
    with open(path, 'r') as f:
        content = f.read()

    # Simple search and replace for some common ones
    content = content.replace("addEventListener('click', async () => {", "addEventListener('click', () => void (async () => {")
    content = content.replace("?.addEventListener('click', async () => {", "?.addEventListener('click', () => void (async () => {")

    with open(path, 'w') as f:
        f.write(content)
