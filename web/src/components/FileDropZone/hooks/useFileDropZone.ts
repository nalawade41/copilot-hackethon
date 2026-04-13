import { useCallback, useRef, useState } from 'react';
import { filterUploadFiles } from './useFileFilter';
import { useFolderInputAttributes } from './useFolderInputAttributes';

/**
 * Full behavior for the FileDropZone:
 * - manages file/folder input refs
 * - junk-filters selections
 * - decides whether to show the confirmation modal based on threshold
 * - exposes drag state + handlers for the drop target
 */
export function useFileDropZone(onFiles: (files: File[]) => void, confirmThreshold: number) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState<File[] | null>(null);

  useFolderInputAttributes(folderInputRef);

  const handle = useCallback(
    (list: FileList | null) => {
      const files = filterUploadFiles(list);
      if (files.length === 0) return;
      if (files.length >= confirmThreshold) {
        setPending(files);
      } else {
        onFiles(files);
      }
    },
    [onFiles, confirmThreshold],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setDragging(false), []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      handle(e.dataTransfer.files);
    },
    [handle],
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handle(e.target.files);
      e.target.value = '';
    },
    [handle],
  );

  const openFilePicker = useCallback(() => fileInputRef.current?.click(), []);
  const openFolderPicker = useCallback(() => folderInputRef.current?.click(), []);

  const confirmPending = useCallback(() => {
    if (pending) onFiles(pending);
    setPending(null);
  }, [pending, onFiles]);

  const cancelPending = useCallback(() => setPending(null), []);

  return {
    fileInputRef,
    folderInputRef,
    dragging,
    pending,
    onDragOver,
    onDragLeave,
    onDrop,
    onInputChange,
    openFilePicker,
    openFolderPicker,
    confirmPending,
    cancelPending,
  };
}
