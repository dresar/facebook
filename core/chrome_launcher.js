// core/chrome_launcher.js - Persistent Full-Access Chrome Launcher
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA_DIR = 'C:\\Users\\NCN0C\\.chrome-automation';
const PORT = 9222;
const DEFAULT_URL = 'https://business.facebook.com/latest/content_calendar?business_id=622318042872290&asset_id=1305449512649082';

function cleanLocks(dir) {
  try {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        cleanLocks(fullPath);
      } else {
        const lower = entry.name.toLowerCase();
        if (lower.includes('lock') || lower.startsWith('singleton')) {
          try { fs.unlinkSync(fullPath); } catch (e) {}
        }
      }
    }
  } catch (e) {}
}

async function isPortListening(port = 9222) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/json/version`, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function launchPersistentChrome(targetUrl = DEFAULT_URL) {
  const isRunning = await isPortListening(PORT);
  if (isRunning) {
    console.log(`✅ Chrome Remote Debugging sudah aktif dan siap di port ${PORT}!`);
    return true;
  }

  console.log('🧹 Membersihkan lock files Chrome...');
  cleanLocks(USER_DATA_DIR);

  console.log('🚀 Menjalankan Google Chrome dengan Akses Penuh & Port Remote Debugging 9222...');
  const args = [
    `--remote-debugging-port=${PORT}`,
    '--remote-allow-origins=*',
    `--user-data-dir=${USER_DATA_DIR}`,
    '--profile-directory=Default',
    '--no-first-run',
    '--no-default-browser-check',
    '--start-maximized',
    targetUrl
  ];

  const child = spawn(CHROME_PATH, args, {
    detached: true,
    stdio: 'ignore'
  });
  child.unref();

  console.log(`📌 Chrome berjalan di background (PID: ${child.pid})`);

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 1000));
    if (await isPortListening(PORT)) {
      console.log(`🎯 Chrome CDP Port ${PORT} berhasil aktif dan siap digunakan!`);
      return true;
    }
  }

  throw new Error(`Gagal mengaktifkan Chrome Remote Debugging di port ${PORT} setelah 30 detik.`);
}

module.exports = {
  launchPersistentChrome,
  isPortListening,
  cleanLocks,
  PORT,
  USER_DATA_DIR,
  DEFAULT_URL
};
