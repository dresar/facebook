// uploader.js - Meta Business Suite Reels Master Automation CLI (Planner & Anti-Bot Engine)
const path = require('path');
const fs = require('fs');
const CDPClient = require('./core/cdp');
const MetaBusinessDriver = require('./core/fb_driver');
const ProductionScheduler = require('./core/scheduler');
const { launchPersistentChrome, isPortListening } = require('./core/chrome_launcher');

// Load configuration
const configPath = path.join(__dirname, 'config', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Parse CLI Arguments
const args = process.argv.slice(2);
const isProduction = args.includes('--production');
const isDryRun = args.includes('--dry-run');
const autoSubmit = args.includes('--submit') || (config.automation && config.automation.default_mode === 'submit');

function getArgValue(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

const fileArg = getArgValue('--file');
const startDateArg = getArgValue('--start-date') || config.production.start_date || '2026-09-01';

// Mutex Lock Handling
const LOCK_FILE = path.join(__dirname, 'config', 'runner.lock');

function acquireLock() {
  if (fs.existsSync(LOCK_FILE)) {
    try {
      const lockData = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
      try {
        process.kill(lockData.pid, 0);
        console.error(`\n❌ [MUTEX LOCK] Proses uploader Facebook sudah aktif di background (PID: ${lockData.pid}, Started: ${lockData.time}).`);
        console.error(`💡 Hentikan proses sebelumnya terlebih dahulu sebelum menjalankan yang baru.\n`);
        process.exit(1);
      } catch (e) {
        console.log('🧹 Menghapus stale lock file dari proses sebelumnya...');
        fs.unlinkSync(LOCK_FILE);
      }
    } catch (e) {
      try { fs.unlinkSync(LOCK_FILE); } catch(err){}
    }
  }

  const dir = path.dirname(LOCK_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(LOCK_FILE, JSON.stringify({ pid: process.pid, time: new Date().toISOString() }), 'utf8');
}

function releaseLock() {
  try {
    if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE);
  } catch (e) {}
}

process.on('exit', releaseLock);
process.on('SIGINT', () => { releaseLock(); process.exit(0); });
process.on('SIGTERM', () => { releaseLock(); process.exit(0); });

async function run() {
  acquireLock();

  console.log('================================================================');
  console.log('🚀 META BUSINESS SUITE REELS MASTER UPLOADER & PLANNER ENGINE');
  console.log('================================================================');
  console.log(`📡 Remote Debug  : ${config.cdp.host}:${config.cdp.port}`);
  console.log(`🎯 Target Akun   : [${config.facebook.target_accounts.join(', ')}]`);
  console.log(`📅 Planner URL   : ${config.facebook.planner_url}`);
  console.log(`⚙️  Mode          : ${isProduction ? 'PRODUCTION BATCH (5 Video/Hari)' : 'SINGLE UPLOAD'}`);
  console.log(`🚀 Eksekusi      : ${autoSubmit ? 'AUTO-SUBMIT (Otomatis Jadwalkan & Klik Done)' : 'PREVIEW ONLY'}`);
  console.log('================================================================\n');

  // 1. Ensure Chrome is running
  const chromeReady = await isPortListening(config.cdp.port);
  if (!chromeReady) {
    await launchPersistentChrome();
  }

  // 2. Connect CDP Client
  const cdp = new CDPClient({ host: config.cdp.host, port: config.cdp.port });
  await cdp.connect();
  await cdp.enableDomains();

  const driver = new MetaBusinessDriver(cdp);

  if (isProduction) {
    // Production Batch Queue Mode
    const scheduler = new ProductionScheduler(config);
    const state = scheduler.loadOrCreateQueue(
      config.production.folders || config.production.folder,
      startDateArg,
      config.production.time_slots,
      config.production.cta_text
    );

    console.log(`📊 Status Antrean Meta Business:`);
    console.log(`   - Total Video      : ${state.totalVideos} file`);
    console.log(`   - Sudah Terjadwal  : ${state.completedCount} (${((state.completedCount/state.totalVideos)*100).toFixed(1)}%)`);
    console.log(`   - Menunggu Antrean : ${state.totalVideos - state.completedCount - state.failedCount}`);
    console.log(`   - Gagal/Perlu Ulang: ${state.failedCount}`);
    console.log(`   - Tanggal Mulai    : ${state.startDate}`);
    console.log('================================================================\n');

    let processedThisSession = 0;

    while (true) {
      const item = scheduler.getNextPendingItem();
      if (!item) {
        console.log('\n🎉 [SELESAI] Semua video dalam antrean Facebook berhasil dijadwalkan 100%!');
        break;
      }

      processedThisSession++;
      console.log('================================================================');
      console.log(`🎬 [Item ${item.index}/${state.totalVideos}] [Progress: ${((state.completedCount/state.totalVideos)*100).toFixed(1)}%]`);
      console.log(`📁 File    : "${path.basename(item.filePath)}"`);
      console.log(`📅 Jadwal  : ${item.targetDate} ${item.targetTime} WIB`);
      console.log(`🔄 Percobaan: ke-${item.retryCount + 1}`);
      console.log('================================================================');

      // 0. Pre-Item Resource Guard & Browser Memory Optimization
      const os = require('os');
      const freeMem = os.freemem();
      const totalMem = os.totalmem();
      const usedPct = ((1 - freeMem / totalMem) * 100).toFixed(1);
      console.log(`💻 [System Guard] Status RAM: ${usedPct}% (Sisa: ${(freeMem/1e9).toFixed(2)} GB / ${(totalMem/1e9).toFixed(2)} GB)`);
      
      // Lakukan pembersihan cache awal agar Chrome selalu fresh & ringan
      await driver.purgeMemoryAndCache();
      await cdp.clearMemoryAndCache();

      try {
        // 1. Start from Planner Page (Gambar 1)
        const plannerUrl = config.facebook.planner_url || 'https://business.facebook.com/latest/content_calendar';
        await driver.openPlanner(plannerUrl);
        await cdp.humanDelay(1500, 2500);

      // 2. Click Dropdown [▼] next to "Create post" -> Click "Create reel" (Gambar 3)
      await driver.triggerCreateReelFromPlanner();
      await cdp.humanDelay(1500, 2500);

        // 3. Upload Video (Step 1: Create)
        await driver.uploadVideo(item.filePath, config.automation.wait_for_video_upload_sec || 90);
        await cdp.humanDelay(1500, 2500);

        // 4. Fill Caption & Hashtags di Step 1 (Create) — role="textbox" ada di form Create
        const captionOk = await driver.fillCaption(item.mainCaption);
        if (!captionOk) {
          console.warn('   ⚠️ Caption Step 1 belum masuk, retry...');
          await cdp.humanDelay(1000, 1500);
          await driver.fillCaption(item.mainCaption);
        }
        await cdp.humanDelay(1500, 2500);

        // 5. Step 1 -> Step 2 (Edit)
        await driver.goToEditStep();
        await cdp.humanDelay(2000, 3000);

        // 6. Step 2 -> Step 3 (Share)
        await driver.goToShareStep();
        await cdp.humanDelay(2500, 3500);

        // 7. Activate Schedule mode & set date/time (DD/MM/YYYY — sesuai placeholder Meta)
        await driver.setScheduleDateAndTime(item.targetDate, item.targetTime);
        await cdp.humanDelay(1500, 2000);

        // 8. Submit & Handle Modal (tombol 'Schedule' setelah mode schedule aktif)
        if (autoSubmit && !isDryRun) {
          await cdp.humanDelay(1500, 2500);
          const submitRes = await driver.submitAndHandleDoneModal('schedule');
          
          if (submitRes && submitRes.success) {
            scheduler.markCompleted(item.index, submitRes);
            console.log(`✅ [Item ${item.index}] BERHASIL DIJADWALKAN: ${item.targetDate} ${item.targetTime}`);

            // 10. Analyze & Verify Calendar View in Planner (Gambar 1)
            // Selalu navigate ke planner dulu sebelum cek jadwal
            await driver.verifyAndAnalyzeCalendar(config.facebook.planner_url, item.targetDate, item.targetTime);

            // 11. 🧹 SMART MEMORY & CACHE PURGE (Per-Item)
            console.log('🧹 [Smart Memory Purge] Melepaskan V8 Heap, membersihkan cache media & temp video...');
            await driver.purgeMemoryAndCache();
            await cdp.clearMemoryAndCache();

          } else {
            throw new Error('Gagal menyelesaikan submit Reel');
          }
        } else {
          console.log(`\n👁️ [Preview Mode] Form item ${item.index} telah siap di layar.`);
          scheduler.markCompleted(item.index, { previewOnly: true });
        }

        // Save progress screenshot if enabled
        if (config.automation.save_screenshots && processedThisSession <= 5) {
          await cdp.captureScreenshot(`planner_item_${item.index}`);
        }

        // Natural Human Cooldown between videos (12s)
        const cooldownSec = (config.automation.anti_bot && config.automation.anti_bot.cooldown_between_videos_sec) || 12;
        console.log(`⏳ Jeda santai antar video (${cooldownSec} detik) agar menyerupai tindakan manusia & anti-bot...`);
        for (let cd = cooldownSec; cd > 0; cd--) {
          process.stdout.write(`\r   ⏳ Melanjutkan ke video berikutnya dalam ${cd}s... `);
          await cdp.sleep(1000);
        }
        console.log('');

      } catch (err) {
        console.error(`❌ [Item ${item.index}] Gagal: ${err.message}`);
        scheduler.markFailed(item.index, err.message);
        await cdp.captureScreenshot(`error_item_${item.index}`);

        if (item.retryCount < 3) {
          console.log(`🔄 [Item ${item.index}] Mengulang proses (Percobaan ke-${item.retryCount + 1}/3) dalam 3 detik...`);
          await cdp.sleep(3000);
        } else {
          console.error(`\n🛑 [STOP ON ERROR] Item ${item.index} gagal setelah 3x percobaan!`);
          console.error(`🛑 Proses antrean DIHENTIKAN agar Anda dapat memeriksa kendala pada video ini.`);
          console.error(`💡 Detail Error: ${err.message}`);
          console.error(`📸 Screenshot tersimpan: error_item_${item.index}.png\n`);
          break;
        }
      }
    }

  } else {
    // Single Video Mode
    const targetVideo = fileArg;
    if (!targetVideo) {
      console.error('❌ Harap tentukan file video menggunakan flag --file "<path/ke/video.mp4>"');
      process.exit(1);
    }

    const scheduler = new ProductionScheduler(config);
    const mainCaption = scheduler.extractCaptionForFile(
      path.dirname(targetVideo),
      path.basename(targetVideo),
      config.production.cta_text
    );

    console.log(`🎬 Mengunggah Single Video ke Facebook: "${path.basename(targetVideo)}"`);
    console.log(`📝 Caption:\n${mainCaption}\n`);

    await driver.openPlanner(config.facebook.planner_url);
    await driver.triggerCreateReelFromPlanner();
    await driver.uploadVideo(targetVideo);
    await driver.fillCaption(mainCaption);
    await driver.goToEditStep();
    await driver.goToShareStep();
    await driver.setScheduleDateAndTime('17/08/2026', '15:00');
    await driver.waitForVideoProcessing(45);

    if (autoSubmit && !isDryRun) {
      const submitRes = await driver.submitAndHandleDoneModal('schedule');
      console.log('🎉 Hasil Submit:', JSON.stringify(submitRes));
      await driver.verifyAndAnalyzeCalendar('17/08/2026', '15:00');
      await driver.purgeMemoryAndCache();
      await cdp.clearMemoryAndCache();
    }
  }

  if (isProduction && typeof scheduler !== 'undefined') {
    const finalStats = scheduler.getStats();
    console.log('\n================================================================');
    console.log('✨ LAPORAN AKHIR SESI PRODUKSI FACEBOOK REELS:');
    console.log(`   - Total Terjadwal : ${finalStats.completed} / ${finalStats.total} (${finalStats.percent})`);
    console.log(`   - Gagal / Pending : ${finalStats.pending + finalStats.failed}`);
    console.log('================================================================\n');
  }

  await cdp.close();
}

run().catch((err) => {
  console.error('❌ Terjadi kesalahan kritis:', err);
});
