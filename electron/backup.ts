import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import AdmZip from 'adm-zip';
import cron from 'node-cron';

// path where your attendance JSON lives
const DATA_FILE = path.join(app.getPath('userData'), 'attendance-data.json');
const BACKUP_DIR = path.join(app.getPath('userData'), 'Backups');
const MAX_BACKUPS = 30; // Keep last 30 days of backups

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);

// Cleanup old backups
function cleanupOldBackups() {
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup-'))
    .sort()
    .reverse();
    
  if (files.length > MAX_BACKUPS) {
    files.slice(MAX_BACKUPS).forEach(file => {
      fs.unlinkSync(path.join(BACKUP_DIR, file));
    });
  }
}

// run every day at 03:00 local time
cron.schedule('0 3 * * *', () => {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      console.warn('❌ No data file found to backup');
      return;
    }

    const zip = new AdmZip();
    zip.addLocalFile(DATA_FILE);
    const stamp = new Date().toISOString().split('T')[0];
    zip.writeZip(path.join(BACKUP_DIR, `backup-${stamp}.zip`));
    
    cleanupOldBackups();
    console.log('✔ nightly backup created', stamp);
  } catch (error) {
    console.error('❌ Backup failed:', error);
  }
});