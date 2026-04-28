const fs = require('fs');

let content = fs.readFileSync('src/components/gist-detail.ts', 'utf8');

// Replace the HEAD and 5f464fe markers
content = content.replace(/<<<<<<< HEAD[\s\S]*?=======\n/g, '');
content = content.replace(/>>>>>>> 5f464fe[\s\S]*?\n/g, '');

// Clean up any remaining esc() calls
content = content.replace(/esc\(/g, 'String(');

// Use html tagged template where backticks were used in the functions that still have it
content = content.replace(/return `\n    <div class="file-tabs/g, "return html`\n    <div class=\"file-tabs");
content = content.replace(/return `\n          <span class="micro-label/g, "return html`\n          <span class=\"micro-label");
content = content.replace(/return `\n    <div class="gist-detail/g, "return html`\n    <div class=\"gist-detail");

fs.writeFileSync('src/components/gist-detail.ts', content);
