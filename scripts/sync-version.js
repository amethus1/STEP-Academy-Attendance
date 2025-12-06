
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJsonPath = path.resolve(__dirname, '../package.json');
const tauriConfPath = path.resolve(__dirname, '../src-tauri/tauri.conf.json');

try {
    // Read package.json
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const version = packageJson.version;

    // Read tauri.conf.json
    const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));

    // Update version
    if (tauriConf.version !== version) {
        console.log(`Updating tauri.conf.json version from ${tauriConf.version} to ${version}`);
        tauriConf.version = version;

        // Write back to tauri.conf.json
        fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2));
        console.log('Successfully updated tauri.conf.json');
    } else {
        console.log('tauri.conf.json version is already up to date');
    }

} catch (error) {
    console.error('Error updating version:', error);
    process.exit(1);
}
