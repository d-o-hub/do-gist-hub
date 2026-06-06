import StyleDictionary from 'style-dictionary';

const sd = new StyleDictionary({
  source: ['src/tokens/**/*.tokens.json'],
  log: {
    verbosity: 'verbose',
  },
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'src/styles/generated/',
      files: [
        {
          destination: 'tokens.css',
          format: 'css/variables',
          options: {
            outputReferences: true,
          },
        },
      ],
    },
    ts: {
      transformGroup: 'js',
      buildPath: 'src/tokens/generated/',
      files: [
        {
          destination: 'tokens.ts',
          format: 'javascript/es6',
        },
      ],
    },
  },
});

await sd.buildAllPlatforms();
