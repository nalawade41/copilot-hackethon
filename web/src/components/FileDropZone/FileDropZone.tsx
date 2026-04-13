import { ConfirmDialog } from '../ConfirmDialog/ConfirmDialog';
import { useFileDropZone } from './hooks/useFileDropZone';
import type { FileDropZoneProps } from './types';

export function FileDropZone({ onFiles, compact = false, confirmThreshold = 2 }: FileDropZoneProps) {
  const {
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
  } = useFileDropZone(onFiles, confirmThreshold);

  const confirmBody = pending ? (
    <>
      <p>
        Load <span className="text-slate-50 font-medium">{pending.length}</span> files into the viewer?
      </p>
      <div className="mt-3 rounded-md border border-slate-800 bg-slate-950/60 text-xs text-slate-400 max-h-32 overflow-y-auto">
        <ul className="divide-y divide-slate-800">
          {pending.slice(0, 6).map((f, i) => (
            <li key={i} className="px-3 py-1.5 truncate" title={f.name}>
              {f.name}
            </li>
          ))}
          {pending.length > 6 && (
            <li className="px-3 py-1.5 text-slate-500 italic">
              … and {pending.length - 6} more
            </li>
          )}
        </ul>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Sample files at the top of the list are shown for reference. All files will be loaded.
      </p>
    </>
  ) : null;

  const confirmModal = (
    <ConfirmDialog
      open={!!pending}
      title="Confirm upload"
      body={confirmBody}
      confirmLabel={pending ? `Load ${pending.length} files` : 'Load'}
      onCancel={cancelPending}
      onConfirm={confirmPending}
    />
  );

  const hiddenInputs = (
    <>
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={onInputChange} />
      <input ref={folderInputRef} type="file" multiple className="hidden" onChange={onInputChange} />
    </>
  );

  if (compact) {
    return (
      <>
        <div className="flex gap-2">
          <button
            className="px-3 py-1.5 text-sm rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700"
            onClick={openFilePicker}
          >
            Open file
          </button>
          <button
            className="px-3 py-1.5 text-sm rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700"
            onClick={openFolderPicker}
          >
            Open folder
          </button>
          {hiddenInputs}
        </div>
        {confirmModal}
      </>
    );
  }

  return (
    <>
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed transition-colors
          ${dragging ? 'border-accent bg-accent/5' : 'border-slate-700 bg-slate-900/40'}
          p-16 text-center`}
      >
        <div className="text-lg text-slate-200">Drop a DICOM file or folder here</div>
        <div className="text-sm text-slate-500">Supports .dcm files and folders of slice series</div>
        <div className="flex gap-2 mt-2">
          <button
            className="px-4 py-2 rounded-md bg-accent text-slate-950 font-medium hover:bg-accent-muted"
            onClick={openFilePicker}
          >
            Choose file
          </button>
          <button
            className="px-4 py-2 rounded-md bg-slate-800 border border-slate-700 hover:bg-slate-700"
            onClick={openFolderPicker}
          >
            Choose folder
          </button>
        </div>
        {hiddenInputs}
      </div>
      {confirmModal}
    </>
  );
}
