export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', ['build', 'chore', 'ci', 'docs', 'feat', 'fix', 'perf', 'refactor', 'revert', 'style', 'test', 'plans']],
  },
  ignores: [
    (commit) => /^(Update|Auto-update|Automatic)/.test(commit),
    (commit) => commit.includes('[skip ci]'),
  ],
};
