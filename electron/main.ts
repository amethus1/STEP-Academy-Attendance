// electron/main.ts
import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { autoUpdater } from 'electron-updater';
import AdmZip from 'adm-zip';
import PDFDocument from 'pdfkit';

require('@electron/remote/main').initialize();

// ──────────────────────────────────────────────────────────────────────────
// Globals
let mainWindow: BrowserWindow | null = null;

// ──────────────────────────────────────────────────────────────────────────
// Daily JSON backup
const backupDir = path.join(app.getPath('userData'), 'Backups');
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

function runDailyBackup() {
  const src = path.join(app.getPath('userData'), 'config.json');
  if (!fs.existsSync(src)) return;

  const stamp = new Date().toISOString().split('T')[0];
  const zip = new AdmZip();
  zip.addLocalFile(src);
  zip.writeZip(path.join(backupDir, `backup-${stamp}.zip`));
}

// ──────────────────────────────────────────────────────────────────────────
// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // compiled from preload.ts
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  require('@electron/remote/main').enable(mainWindow.webContents);

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  const prodUrl = `file://${path.join(__dirname, '../dist/index.html')}`;
  mainWindow.loadURL(devUrl ?? prodUrl);

  mainWindow.on('closed', () => (mainWindow = null));

  autoUpdater.checkForUpdatesAndNotify();
}

// ──────────────────────────────────────────────────────────────────────────
// App lifecycle
app.whenReady().then(() => {
  createWindow();
  runDailyBackup();
  setInterval(runDailyBackup, 24 * 60 * 60 * 1000);
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ──────────────────────────────────────────────────────────────────────────
// IPC  ♦  CSV export
ipcMain.handle('save-csv', async (_e, csvText: string) => {
  const { filePath } = await dialog.showSaveDialog({
    title: 'Save Attendance Log',
    defaultPath: 'attendance-log.csv',
    filters: [{ name: 'CSV', extensions: ['csv'] }]
  });
  if (!filePath) return { success: false };

  try {
    fs.writeFileSync(filePath, csvText);
    return { success: true, path: filePath };
  } catch (err) {
    console.error(err);
    return { success: false, error: String(err) };
  }
});

// ──────────────────────────────────────────────────────────────────────────
// IPC  ♦  PDF export
interface BarPoint { label: string; value: 0 | 1; }
interface PdfPayload {
  studentName: string;
  daysPresent: number;
  daysAbsent: number;
  comments: string;
  barData: BarPoint[];
}

ipcMain.handle('save-pdf', async (_e, p: PdfPayload) => {
  const { filePath } = await dialog.showSaveDialog({
    title: 'Save Student Summary',
    defaultPath: `${p.studentName.replace(/\s+/g, '_')}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  });
  if (!filePath) return { success: false };

  try {
    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(fs.createWriteStream(filePath));

    // Header
    doc.fontSize(18).text('Weekly Attendance Summary', { align: 'center' });
    doc.moveDown(1);

    // Stats
    doc.fontSize(12);
    doc.text(`Student: ${p.studentName}`);
    doc.text(`Days Present: ${p.daysPresent}`);
    doc.text(`Days Absent:  ${p.daysAbsent}`);
    doc.moveDown(0.5);

    // Comments
    if (p.comments) {
      doc.font('Helvetica-Bold').text('Comments:');
      doc.font('Helvetica').text(p.comments, { indent: 10 });
      doc.moveDown(0.5);
    }

    // Mini bar-chart
    const top = doc.y + 10;
    const BAR_W = 40, BAR_H = 120, GAP = 20;

    p.barData.forEach((d, i) => {
      const x = 60 + i * (BAR_W + GAP);
      const filled = d.value ? BAR_H : BAR_H * 0.05;

      doc.rect(x, top, BAR_W, BAR_H).stroke(); // outline
      if (d.value) {
        doc.rect(x, top + (BAR_H - filled), BAR_W, filled)
           .fillOpacity(0.85).fill('#3b82f6');
      }
      doc.fillColor('#000').fontSize(10)
         .text(d.label, x, top + BAR_H + 5, { width: BAR_W, align: 'center' });
    });

    doc.end();
    return { success: true, path: filePath };
  } catch (err) {
    console.error('PDF export failed:', err);
    return { success: false, error: String(err) };
  }
});

// ──────────────────────────────────────────────────────────────────────────
// Basic menu
const menu = Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'fileMenu' }]);
Menu.setApplicationMenu(menu);