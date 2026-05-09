import fs from 'fs';

let content = fs.readFileSync('tests/unit/sync-queue.test.ts', 'utf8');

content = content.replace(
  /const deleteOrder = vi\.mocked\(github\.deleteGist\)\.mock\.invocationCallOrder\[0\];\n      expect\(updateOrder\)\.toBeLessThan\(deleteOrder\);/g,
  `const deleteOrder = vi.mocked(github.deleteGist).mock.invocationCallOrder[0];
      expect(updateOrder).toBeLessThan(deleteOrder);`
);

fs.writeFileSync('tests/unit/sync-queue.test.ts', content);
