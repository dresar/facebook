const CDPClient = require('./core/cdp');
const MetaBusinessDriver = require('./core/fb_driver');
const path = require('path');
const fs = require('fs');

async function testSingleVideo() {
  console.log('================================================================');
  console.log('🧪 TEST UPLOAD 1 VIDEO (001.mp4) - DEEP ANALYSIS & LOGGING');
  console.log('================================================================');

  const config = JSON.parse(fs.readFileSync('./config/config.json', 'utf8'));
  const cdp = new CDPClient({ host: config.cdp.host, port: config.cdp.port });
  await cdp.connect();
  await cdp.enableDomains();

  const driver = new MetaBusinessDriver(cdp);

  const videoFile = "C:\\Users\\NCN0C\\Videos\\facebook\\oupot ready\\001.mp4";
  const captionText = "COPET AUTO NANGIS?! Sering was-was pas bawa ransel di tempat rame? Cobain nih, tas ransel anti maling yang #BarangUnik #RacunShopee #SpillBarangUnik\n\n🔗 https://s.shopee.co.id/W5tdFC4Ks";
  const targetDate = "18/08/2026";
  const targetTime = "09:00";

  console.log('1. Membersihkan cache browser dan memory heap...');
  await driver.purgeMemoryAndCache();
  await cdp.clearMemoryAndCache();

  console.log('2. Membuka halaman Planner secara fresh...');
  await cdp.navigate(config.facebook.planner_url);
  await cdp.sleep(4000);
  await driver.handleDismissableBanners();

  console.log('3. Memicu "Create reel" dari dropdown Planner...');
  await driver.triggerCreateReelFromPlanner();
  await cdp.sleep(3000);

  console.log('4. Mengunggah video 001.mp4...');
  // File chooser interceptor
  await cdp.send('Page.setInterceptFileChooserDialog', { enabled: true });
  cdp.removeAllListeners('Page.fileChooserOpened');

  let fileInjected = false;
  cdp.on('Page.fileChooserOpened', async (params) => {
    console.log('⚡ File Chooser Terbuka! Menyuntikkan file:', path.basename(videoFile));
    try {
      await cdp.send('DOM.setFileInputFiles', {
        files: [videoFile],
        backendNodeId: params.backendNodeId
      });
      console.log('✅ File video berhasil disuntikkan ke input browser!');
      fileInjected = true;
      await cdp.send('Page.setInterceptFileChooserDialog', { enabled: false }).catch(() => {});
    } catch (e) {
      console.error('❌ Error saat setFileInputFiles:', e.message);
    }
  });

  // Cari dan klik tombol Add video
  const addBtn = await cdp.eval(`(() => {
    const btns = Array.from(document.querySelectorAll('button, div[role="button"], span, div'))
      .filter(el => (el.innerText || '').trim().toLowerCase() === 'add video');
    if (btns.length === 0) return null;
    const b = btns[0];
    const r = b.getBoundingClientRect();
    return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) };
  })()`);

  if (addBtn) {
    console.log(`   🖱️ Mengklik [Add video] di (${addBtn.x}, ${addBtn.y})...`);
    await cdp.dispatchHumanClick(addBtn.x, addBtn.y);
  }

  console.log('5. Mengisi Caption & Hashtag selagi video diproses...');
  await cdp.sleep(2000);
  await driver.fillCaption(captionText);

  console.log('6. Menunggu pemrosesan video hingga tombol Next AKTIF (Maks 300s / 5 Menit)...');
  const startWait = Date.now();
  let uploadSuccess = false;

  for (let sec = 1; sec <= 300; sec++) {
    await cdp.sleep(1000);
    await driver.handleDismissableBanners();

    // Mute video
    await cdp.eval(`(() => {
      document.querySelectorAll('video, audio').forEach(v => { v.muted = true; v.volume = 0; });
    })()`);

    const status = await cdp.eval(`(() => {
      const allText = Array.from(document.querySelectorAll('*'))
        .map(e => (e.innerText || e.textContent || '').trim())
        .filter(t => t.length > 0 && t.length < 80);
      
      const percentText = allText.find(t => /\\d{1,3}%/.test(t)) || '';
      const videoEl = document.querySelector('video');
      const nextBtn = Array.from(document.querySelectorAll('button, div[role="button"]'))
        .find(b => (b.textContent || '').trim().toLowerCase() === 'next');
      
      const isNextEnabled = nextBtn && !nextBtn.disabled && nextBtn.getAttribute('aria-disabled') !== 'true' && !nextBtn.classList.contains('disabled');
      const hasToast = Array.from(document.querySelectorAll('*')).some(e => (e.textContent||'').toLowerCase().includes('wait for the media'));

      return {
        percentText: percentText || (videoEl ? 'Processing/Ready' : 'Waiting...'),
        hasVideo: !!videoEl,
        videoReadyState: videoEl ? videoEl.readyState : 0,
        isNextEnabled,
        hasToast
      };
    })()`);

    const elapsed = Math.round((Date.now() - startWait) / 1000);
    process.stdout.write(`\r   ⏳ [${elapsed}s/300s] Progress: ${status.percentText} | Next Active: ${status.isNextEnabled} | Toast: ${status.hasToast}   `);

    // Cek apakah tombol Next sudah benar-benar siap dan bisa diklik
    if (status.isNextEnabled && !status.hasToast) {
      console.log(`\n🎉 [SUKSES] Video 100% siap tayang pada detik ke-${elapsed}!`);
      uploadSuccess = true;
      break;
    }
  }

  if (!uploadSuccess) {
    console.error('\n❌ Video belum siap setelah 5 menit. Mengambil screenshot diagnosis...');
    await cdp.captureScreenshot('debug_upload_timeout');
    await cdp.close();
    process.exit(1);
  }

  console.log('7. Melangkah ke Step 2 (Edit)...');
  await driver.goToEditStep();
  await cdp.sleep(2500);

  console.log('8. Melangkah ke Step 3 (Share)...');
  await driver.goToShareStep();
  await cdp.sleep(2500);

  console.log(`9. Mengatur Jadwal: ${targetDate} ${targetTime} WIB...`);
  await driver.setScheduleDateAndTime(targetDate, targetTime);
  await cdp.sleep(2000);

  console.log('10. Menjalankan Schedule Submit & Auto-dismiss modal...');
  const submitRes = await driver.submitAndHandleDoneModal('schedule');
  console.log('🎉 Hasil Submit:', JSON.stringify(submitRes));

  console.log('11. Verifikasi di kalender Planner...');
  await driver.verifyAndAnalyzeCalendar(config.facebook.planner_url, targetDate, targetTime);

  console.log('12. Mengambil screenshot verifikasi akhir...');
  const verifyShot = await cdp.captureScreenshot('single_upload_001_success');
  console.log('📸 Screenshot hasil verifikasi:', verifyShot);

  console.log('🧹 Pembersihan memory & cache akhir...');
  await driver.purgeMemoryAndCache();
  await cdp.clearMemoryAndCache();

  console.log('\n================================================================');
  console.log('✅ UPLOAD & PENJADWALAN VIDEO 001 BERHASIL 100%!');
  console.log('================================================================\n');

  await cdp.close();
}

testSingleVideo().catch(err => {
  console.error('❌ Error kritis pada test single video:', err);
});
