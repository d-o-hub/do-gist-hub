import os

with open('src/services/sync/queue.ts', 'r') as f:
    content = f.read()

# Make methods static again
content = content.replace('private isRetryableError', 'private static isRetryableError')
content = content.replace('private delay', 'private static delay')
content = content.replace('async getQueueLength', 'static async getQueueLength')

# Update internal calls to static methods
content = content.replace('this.isRetryableError(error)', 'SyncQueue.isRetryableError(error)')
content = content.replace('await this.delay(backoff)', 'await SyncQueue.delay(backoff)')

with open('src/services/sync/queue.ts', 'w') as f:
    f.write(content)

with open('src/components/app.ts', 'r') as f:
    content = f.read()

# Update app.ts calls to static method
content = content.replace('syncQueue.getQueueLength()', 'SyncQueue.getQueueLength()')
# Also need to import SyncQueue if it's used as a value/type
if 'SyncQueue' not in content:
    content = content.replace("import syncQueue from '../services/sync/queue';", "import syncQueue, { SyncQueue } from '../services/sync/queue';")

with open('src/components/app.ts', 'w') as f:
    f.write(content)
