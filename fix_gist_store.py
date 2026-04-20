import os

with open('src/stores/gist-store.ts', 'r') as f:
    content = f.read()

# Add JSDoc for notifyListeners
content = content.replace(
    '  private notifyListeners(): void {',
    '  /**\n   * Notify all listeners\n   */\n  private notifyListeners(): void {'
)

# Add JSDoc for sortGists
content = content.replace(
    '  private sortGists(): void {',
    '  /**\n   * Sort gists by updated_at (descending)\n   * ⚡ Bolt: Use numeric timestamp comparison to avoid object creation in sort loop\n   */\n  private sortGists(): void {'
)

# Add JSDoc for mergeGistRecord
content = content.replace(
    '  private mergeGistRecord(record: GistRecord, starred: boolean, skipSort = false): void {',
    '  /**\n   * Merge a gist record into the local list.\n   * Updates existing or adds new, maintains sort order.\n   * ⚡ Bolt: Added skipSort parameter for bulk operations\n   */\n  private mergeGistRecord(record: GistRecord, starred: boolean, skipSort = false): void {'
)

with open('src/stores/gist-store.ts', 'w') as f:
    f.write(content)
