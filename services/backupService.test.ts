import { describe, it, expect } from 'vitest';
import {
    selectBackupsToPrune,
    shouldRunAutoBackup,
    generateBackupFilename,
    AUTO_BACKUP_PREFIX,
    SAFETY_BACKUP_PREFIX
} from './backupService';
import { defaultSettings } from './settingsService';
import type { AppSettings } from '../types';

const settings = (over: Partial<AppSettings>): AppSettings => ({ ...defaultSettings, ...over });

describe('selectBackupsToPrune', () => {
    const auto = (stamp: string) => `${AUTO_BACKUP_PREFIX}${stamp}.json`;

    it('keeps the newest files and returns the oldest for deletion', () => {
        const files = [auto('2025-09-03T08-00-00'), auto('2025-09-01T08-00-00'), auto('2025-09-02T08-00-00')];
        expect(selectBackupsToPrune(files, AUTO_BACKUP_PREFIX, 2)).toEqual([auto('2025-09-01T08-00-00')]);
    });

    it('deletes nothing when under the limit', () => {
        expect(selectBackupsToPrune([auto('2025-09-01T08-00-00')], AUTO_BACKUP_PREFIX, 5)).toEqual([]);
    });

    it('never touches files the app did not write', () => {
        const files = ['attendance-report.json', 'notes.txt', `${SAFETY_BACKUP_PREFIX}2025-01-01T00-00-00.json`, auto('2025-09-01T08-00-00')];
        expect(selectBackupsToPrune(files, AUTO_BACKUP_PREFIX, 0)).toEqual([auto('2025-09-01T08-00-00')]);
    });

    it('sorts by the embedded timestamp across years', () => {
        const files = [auto('2026-01-02T00-00-00'), auto('2025-12-31T00-00-00')];
        expect(selectBackupsToPrune(files, AUTO_BACKUP_PREFIX, 1)).toEqual([auto('2025-12-31T00-00-00')]);
    });
});

describe('generateBackupFilename', () => {
    it('produces names the pruning recognises', () => {
        const name = generateBackupFilename();
        expect(selectBackupsToPrune([name], AUTO_BACKUP_PREFIX, 0)).toEqual([name]);
    });

    it('uses the given prefix', () => {
        expect(generateBackupFilename(SAFETY_BACKUP_PREFIX).startsWith(SAFETY_BACKUP_PREFIX)).toBe(true);
    });
});

describe('shouldRunAutoBackup', () => {
    it('runs without a chosen folder (the app folder is used)', () => {
        expect(shouldRunAutoBackup(settings({ autoBackupFrequency: 'daily', backupFolderPath: null, lastAutoBackupDate: null })))
            .toBe(true);
    });

    it('is on by default for a new install', () => {
        expect(defaultSettings.autoBackupFrequency).toBe('daily');
        expect(shouldRunAutoBackup(settings({ lastAutoBackupDate: null }))).toBe(true);
    });

    it('respects off', () => {
        expect(shouldRunAutoBackup(settings({ autoBackupFrequency: 'off' }))).toBe(false);
    });

    it('waits a day between daily backups', () => {
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
        expect(shouldRunAutoBackup(settings({ autoBackupFrequency: 'daily', lastAutoBackupDate: hourAgo }))).toBe(false);
        expect(shouldRunAutoBackup(settings({ autoBackupFrequency: 'daily', lastAutoBackupDate: twoDaysAgo }))).toBe(true);
    });

    it('leaves on-change backups to the write path, not app start', () => {
        expect(shouldRunAutoBackup(settings({ autoBackupFrequency: 'onDataChange' }))).toBe(false);
    });
});
