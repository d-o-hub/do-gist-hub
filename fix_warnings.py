import os
import re

def fix_file(path, replacements):
    if not os.path.exists(path): return
    with open(path, 'r') as f:
        content = f.read()
    for old, new in replacements:
        content = content.replace(old, new)
    with open(path, 'w') as f:
        f.write(content)

# Fix app.ts
fix_file('src/components/app.ts', [
    ("addEventListener('click', async ()", "addEventListener('click', () => void (async ()"),
    ("?.addEventListener('click', async ()", "?.addEventListener('click', () => void (async ()"),
    ("this.render()", "void this.render()"),
    ("this.setupNavigation()", "void this.setupNavigation()"),
    ("this.initializeCommandPalette()", "void this.initializeCommandPalette()"),
    ("this.subscribeStore()", "void this.subscribeStore()"),
    ("this.updateGistList()", "void this.updateGistList()"),
    ("this.updateOfflineStatus()", "void this.updateOfflineStatus()"),
    ("this.loadTokenInfo()", "void this.loadTokenInfo()"),
    ("this.loadOfflineLogs()", "void this.loadOfflineLogs()"),
    ("this.loadDiagnostics()", "void this.loadDiagnostics()"),
    ("this.loadTokenInfo()", "void this.loadTokenInfo()"),
])

# Fix gist-detail.ts
fix_file('src/components/gist-detail.ts', [
    ("addEventListener('click', async ()", "addEventListener('click', () => void (async ()"),
])

# Fix gist-card.ts
fix_file('src/components/gist-card.ts', [
    ("addEventListener('click', async ()", "addEventListener('click', () => void (async ()"),
])

# Fix gist-edit.ts
fix_file('src/components/gist-edit.ts', [
    ("addEventListener('submit', async (e)", "addEventListener('submit', (e) => void (async (e)"),
])

# Fix queue.ts
fix_file('src/services/sync/queue.ts', [
    ("this.processQueue()", "void this.processQueue()"),
])
