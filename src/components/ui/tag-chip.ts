import type { TagRecord } from '../../services/db';

export function renderTagChip(tag: TagRecord, removable = false): string {
  return `<span class="tag-chip" data-tag-id="${tag.id}" style="background-color: ${tag.color}20; color: ${tag.color}; border-color: ${tag.color}40;">
    <span class="tag-chip-label">${tag.name}</span>
    ${removable ? `<button class="tag-chip-remove" data-remove-tag="${tag.id}" aria-label="Remove tag ${tag.name}">&times;</button>` : ''}
  </span>`;
}

export function renderTagChips(tags: TagRecord[], removable = false): string {
  return tags.map((tag) => renderTagChip(tag, removable)).join('');
}
