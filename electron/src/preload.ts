import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('pacs', {
  listStudies: () => ipcRenderer.invoke('pacs:list-studies'),
  loadStudy: (studyUID: string) => ipcRenderer.invoke('pacs:load-study', studyUID),
  onStudiesChanged: (cb: (studies: unknown[]) => void) => {
    const handler = (_e: unknown, studies: unknown[]) => cb(studies);
    ipcRenderer.on('pacs:studies-changed', handler);
    return () => { ipcRenderer.off('pacs:studies-changed', handler); };
  },
  onConnectionError: (cb: (message: string) => void) => {
    const handler = (_e: unknown, message: string) => cb(message);
    ipcRenderer.on('pacs:connection-error', handler);
    return () => { ipcRenderer.off('pacs:connection-error', handler); };
  },
});
