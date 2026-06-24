import { describe, expect, it } from 'vitest';
import { renderTagChip, renderTagChips } from '../../src/components/ui/tag-chip';
import type { TagRecord } from '../../src/services/db';

function makeTag(overrides: Partial<TagRecord> = {}): TagRecord {
  return {
    id: 'tag-1',
    name: 'important',
    color: '#3b82f6',
    gistIds: ['gist-1'],
    ...overrides,
  };
}

describe('renderTagChip', () => {
  it('renders tag name and color', () => {
    const tag = makeTag();
    const html = renderTagChip(tag);
    expect(html).toContain('important');
    expect(html).toContain('#3b82f6');
  });

  it('includes tag-chip class', () => {
    const html = renderTagChip(makeTag());
    expect(html).toContain('class="tag-chip"');
  });

  it('includes data-tag-id attribute', () => {
    const html = renderTagChip(makeTag({ id: 'tag-42' }));
    expect(html).toContain('data-tag-id="tag-42"');
  });

  it('does not include remove button by default', () => {
    const html = renderTagChip(makeTag());
    expect(html).not.toContain('tag-chip-remove');
  });

  it('includes remove button when removable is true', () => {
    const html = renderTagChip(makeTag({ id: 'tag-r' }), true);
    expect(html).toContain('tag-chip-remove');
    expect(html).toContain('data-remove-tag="tag-r"');
  });

  it('sets aria-label on remove button', () => {
    const html = renderTagChip(makeTag({ name: 'bug' }), true);
    expect(html).toContain('aria-label="Remove tag bug"');
  });

  it('applies inline styles with color', () => {
    const html = renderTagChip(makeTag({ color: '#ff0000' }));
    expect(html).toContain('background-color: #ff000020');
    expect(html).toContain('color: #ff0000');
    expect(html).toContain('border-color: #ff000040');
  });
});

describe('renderTagChips', () => {
  it('renders multiple tags', () => {
    const tags = [makeTag({ id: 't1', name: 'a' }), makeTag({ id: 't2', name: 'b' })];
    const html = renderTagChips(tags);
    expect(html).toContain('a');
    expect(html).toContain('b');
  });

  it('returns empty string for empty array', () => {
    expect(renderTagChips([])).toBe('');
  });

  it('passes removable flag to each chip', () => {
    const tags = [makeTag({ id: 't1' })];
    const html = renderTagChips(tags, true);
    expect(html).toContain('tag-chip-remove');
  });
});
