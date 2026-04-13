/**
 * Strips macOS/Windows junk (.DS_Store, Thumbs.db) from a FileList.
 * Returns an Array of the kept Files, or an empty array if the list is empty
 * or only contains junk.
 */
export function filterUploadFiles(list: FileList | null): File[] {
  if (!list || list.length === 0) return [];
  return Array.from(list).filter((f) => {
    const name = f.name;
    return name !== '.DS_Store' && name !== 'Thumbs.db';
  });
}
