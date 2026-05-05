module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'build',
        'chore',
        'ci',
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'revert',
        'style',
        'test',
        'plans',
      ],
    ],
    'header-max-length': [2, 'always', 100],
  },
  ignores: (commit) =>
    commit.startsWith('Update SKILL.md') || commit.startsWith('Merge') || commit.includes('[bot]'),
};
