import type { TagRecord } from '../../services/db';
import { sanitizeHtml } from '../../services/security/dom';

export function renderTagChip(tag: TagRecord, removable = false): string {
  const id = sanitizeHtml(tag.id);
  const name = sanitizeHtml(tag.name);
  const color = sanitizeHtml(tag.color);

  return `<span class="tag-chip" data-tag-id="${id}" style="background-color: ${color}20; color: ${color}; border-color: ${color}40;">
    <span class="tag-chip-label">${name}</span>
    ${
      removable
        ? `<button class="tag-chip-remove" data-remove-tag="${id}" aria-label="Remove tag ${name}">&times;</button>`
        : ''
    }
  </span>`;
}

export function renderTagChips(tags: TagRecord[], removable = false): string {
  return tags.map((tag) => renderTagChip(tag, removable)).join('');
}
