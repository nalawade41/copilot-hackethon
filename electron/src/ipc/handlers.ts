import { ipcMain } from 'electron';
import {
  listStudies,
  listSeries,
  listInstanceUIDs,
  fetchInstance,
  createPoller,
  type PacsStudy,
} from '../orthanc';
import { ORTHANC_CFG } from '../config';
import { getMainWindow } from '../main';

/**
 * Registers all `pacs:*` IPC handlers and starts the 2-second polling loop.
 *
 * Must be called EXACTLY ONCE at app startup — NOT per-window. On macOS,
 * `createWindow()` can run multiple times (app stays alive when the last
 * window closes; clicking the dock icon fires `activate` → createWindow).
 * Calling `ipcMain.handle()` twice for the same channel throws, so we keep
 * handler registration and polling outside the per-window lifecycle.
 *
 * The poller's callbacks look up the *current* focused/first window each
 * tick instead of capturing a single reference — that way the events always
 * go to whatever window is open now, even after a close+reopen cycle.
 */
export function registerPacsHandlers(): void {
  // --- Request/response handlers ---

  ipcMain.handle('pacs:list-studies', () => listStudies(ORTHANC_CFG));

  ipcMain.handle('pacs:load-study', async (_evt, studyUID: string) => {
    const allStudies = await listStudies(ORTHANC_CFG);
    const study = allStudies.find((s) => s.studyInstanceUID === studyUID);
    if (!study) throw new Error(`study not found: ${studyUID}`);

    const allSeries = await listSeries(studyUID, ORTHANC_CFG);
    const imageIds: string[] = [];
    for (const series of allSeries) {
      const instanceUIDs = await listInstanceUIDs(
        studyUID,
        series.seriesInstanceUID,
        ORTHANC_CFG,
      );
      for (const iuid of instanceUIDs) {
        const buf = await fetchInstance(
          studyUID,
          series.seriesInstanceUID,
          iuid,
          ORTHANC_CFG,
        );
        const b64 = Buffer.from(new Uint8Array(buf)).toString('base64');
        imageIds.push(`wadouri:data:application/dicom;base64,${b64}`);
      }
    }

    return { study, imageIds };
  });

  // --- Polling ---

  // Look up the current window at send time (not at registration time).
  // This lets events reach whichever window is open after close+reopen.
  const sendToWindow = (channel: string, payload: unknown) => {
    // Use the tracked main window reference — NOT BrowserWindow.getAllWindows()[0].
    // The order of getAllWindows() is undefined and can return a transient
    // popup (e.g. an Orthanc admin UI link opened via target="_blank"), which
    // has no preload and silently drops our events.
    const win = getMainWindow();
    if (win) {
      win.webContents.send(channel, payload);
    }
  };

  const poller = createPoller({
    intervalMs: 2000,
    listStudies: () => listStudies(ORTHANC_CFG),
    onChange: (studies: PacsStudy[]) => {
      sendToWindow('pacs:studies-changed', studies);
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : String(err);
      sendToWindow('pacs:connection-error', message);
    },
  });

  poller.start();
}
