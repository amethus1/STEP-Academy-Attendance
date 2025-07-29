// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

/**
 * Expose only what the UI needs.
 * window.electron.savePdf(payload)   → returns { success, path? }
 * window.electron.saveCsv(csvText)   → returns { success, path? }
 */
contextBridge.exposeInMainWorld('electron', {
  savePdf:  (payload: unknown) => ipcRenderer.invoke('save-pdf', payload),
  saveCsv:  (csv: string)      => ipcRenderer.invoke('save-csv', csv)
});

export {};