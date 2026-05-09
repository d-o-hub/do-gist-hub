export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', ['build', 'merge', 'chore', 'ci', 'docs', 'feat', 'fix', 'perf', 'refactor', 'revert', 'style', 'test', 'plans']],
    'header-max-length': [2, 'always', 150],
    'body-max-line-length': [2, 'always', 200],
  },
  ignores: [
    (commit) => /^Merge (branch|pull request)/.test(commit),
  ],
};
