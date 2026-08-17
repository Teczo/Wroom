/** Escapes user input before it goes into a `$regex` search. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Case-insensitive "contains" filter for a free-text search box. */
export function containsFilter(value: string): { $regex: string; $options: string } {
  return { $regex: escapeRegex(value), $options: 'i' };
}
