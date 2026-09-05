// login.js - Script cepat untuk membuka browser Chrome & Login ke Meta Business Suite
const { spawn, execSync } = require('child_process');
const { cleanLocks, PORT, USER_DATA_DIR, launchPersistentChrome } = require('./core/chrome_launcher');

const LOGIN_URL = 'https://business.facebook.com';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function main() {
  console.log('================================================================');
  console.log('🌐 MEMBUKA CHROME AUTOMATION UNTUK LOGIN META BUSINESS SUITE');
  console.log('================================================================');

  try {
    console.log('🧹 Menutup proses Chrome lama agar jendela GUI muncul di layar...');
    execSync('taskkill /F /IM chrome.exe', { stdio: 'ignore' });
  } catch (e) {}

  cleanLocks(USER_DATA_DIR);

  console.log(`🚀 Menjalankan Chrome GUI...`);
  const child = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--remote-allow-origins=*',
    `--user-data-dir=${USER_DATA_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--start-maximized',
    LOGIN_URL
  ], {
    detached: true,
    stdio: 'ignore'
  });
  child.unref();

  console.log('\n✅ BROWSER CHROME BERHASIL DIBUKA DI LAYAR!');
  console.log('👉 Silakan login manual ke akun Facebook / Meta Business Anda di browser tersebut.');
  console.log('👉 Setelah login berhasil, jalankan otomatisasi dengan:');
  console.log('   node uploader.js --production --submit\n');
}

main().catch(console.error);
