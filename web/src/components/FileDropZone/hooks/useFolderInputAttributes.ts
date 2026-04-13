import { useEffect, type RefObject } from 'react';

/**
 * Imperatively sets `webkitdirectory` and `directory` attributes on a file
 * input. React's JSX-as-attribute handling for non-standard HTML attrs is
 * inconsistent across versions; doing it via ref is reliable.
 */
export function useFolderInputAttributes(ref: RefObject<HTMLInputElement | null>): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.setAttribute('webkitdirectory', '');
    el.setAttribute('directory', '');
  }, [ref]);
}
