import os

with open('src/components/gist-detail.ts', 'r') as f:
    content = f.read()

# Simplify visibility and starred logic
old_block = """  const visibilityMap: Record<string, string> = { 'true': 'Public', 'false': 'Secret' };
  const visibility = visibilityMap[String(gist.public)];
  const starredMap: Record<string, { icon: string; label: string }> = {
    'true': { icon: '★', label: 'Unstar' },
    'false': { icon: '☆', label: 'Star' },
  };
  const starState = starredMap[String(gist.starred)] || starredMap['false'];
  const { icon: starIcon, label: starLabel } = starState!;"""

new_block = """  const visibility = gist.public ? 'Public' : 'Secret';
  const starIcon = gist.starred ? '★' : '☆';
  const starLabel = gist.starred ? 'Unstar' : 'Star';"""

content = content.replace(old_block, new_block)

with open('src/components/gist-detail.ts', 'w') as f:
    f.write(content)
