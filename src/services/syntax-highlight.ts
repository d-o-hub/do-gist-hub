import type { BundledLanguage, BundledTheme, HighlighterGeneric } from 'shiki';

let highlighterPromise: Promise<HighlighterGeneric<BundledLanguage, BundledTheme>> | null = null;

const DARK_THEME = 'github-dark' as BundledTheme;
const LIGHT_THEME = 'github-light' as BundledTheme;
const MAX_SIZE_FOR_SYNC_HIGHLIGHT = 100 * 1024;

const EMPTY_HTML = '';

const LANGUAGE_MAP: Record<string, BundledLanguage> = {
  js: 'javascript',
  ts: 'typescript',
  jsx: 'jsx',
  tsx: 'tsx',
  rb: 'ruby',
  py: 'python',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  md: 'markdown',
  kt: 'kotlin',
  cs: 'csharp',
  'c++': 'cpp',
  rs: 'rust',
};

function resolveLanguage(input: string | undefined): BundledLanguage | null {
  if (!input) return null;
  const normalized = input.toLowerCase().trim();
  const mapped = LANGUAGE_MAP[normalized] as BundledLanguage | undefined;
  return mapped ?? (normalized as BundledLanguage);
}

function getHighlighter(): Promise<HighlighterGeneric<BundledLanguage, BundledTheme>> {
  if (!highlighterPromise) {
    highlighterPromise = import('shiki').then((mod) =>
      mod.createHighlighter({
        themes: [DARK_THEME, LIGHT_THEME],
        langs: [],
      })
    );
  }
  return highlighterPromise;
}

export async function highlightCode(
  code: string,
  language?: string,
  isDark = true
): Promise<string> {
  if (!code) return EMPTY_HTML;

  const lang = resolveLanguage(language);
  if (!lang) return '';
  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  try {
    const highlighter = await getHighlighter();
    await highlighter.loadLanguage(lang);

    return highlighter.codeToHtml(code, {
      lang,
      theme,
      transformers: [
        {
          pre(node) {
            this.addClassToHast(node, 'shiki-highlighted');
          },
        },
      ],
    });
  } catch {
    return '';
  }
}

export function shouldLazyHighlight(code: string): boolean {
  return code.length > MAX_SIZE_FOR_SYNC_HIGHLIGHT;
}

export function resetHighlighter(): void {
  highlighterPromise = null;
}
