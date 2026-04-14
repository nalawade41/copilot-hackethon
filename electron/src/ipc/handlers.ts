import { ipcMain, type BrowserWindow } from 'electron';
import {
  listStudies,
  listSeries,
  listInstanceUIDs,
  fetchInstance,
  createPoller,
  type PacsStudy,
} from '../orthanc';
import { ORTHANC_CFG } from '../config';

/**
 * Registers all `pacs:*` IPC handlers and starts the 2-second polling loop.
 * Call once after the BrowserWindow is created.
 */
export function registerPacsHandlers(mainWindow: BrowserWindow): void {
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

  const poller = createPoller({
    intervalMs: 2000,
    listStudies: () => listStudies(ORTHANC_CFG),
    onChange: (studies: PacsStudy[]) => {
      mainWindow.webContents.send('pacs:studies-changed', studies);
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : String(err);
      mainWindow.webContents.send('pacs:connection-error', message);
    },
  });

  poller.start();
}
