const CDPClient = require('./core/cdp');

async function liveMonitorUpload() {
  const cdp = new CDPClient();
  await cdp.connect();
  await cdp.enableDomains();

  console.log('🔍 Memantau status tombol Next dan upload secara pasif...');
  
  for (let t = 1; t <= 40; t++) {
    await cdp.sleep(3000);
    const info = await cdp.eval(`(() => {
      const all = Array.from(document.querySelectorAll('*'));
      const toast = all.find(e => (e.innerText || '').includes('Please wait for the media'));
      const nextBtn = all.find(e => (e.innerText || '').trim() === 'Next' && e.getBoundingClientRect().y > 500 && e.getBoundingClientRect().x > 900);
      const isNextDisabled = nextBtn ? nextBtn.getAttribute('aria-disabled') : 'not found';
      
      return {
        hasToast: !!toast,
        isNextDisabled: isNextDisabled,
        nextRect: nextBtn ? { x: Math.round(nextBtn.getBoundingClientRect().x), y: Math.round(nextBtn.getBoundingClientRect().y) } : null
      };
    })()`);

    console.log(`[Detik ${t * 3}] Status Form:`, JSON.stringify(info));

    if (!info.hasToast && info.isNextDisabled === 'false') {
      console.log('🎉 TOMBOL NEXT SUDAH AKTIF DAN UPLOAD 100% SELESAI!');
      break;
    }
  }

  const shot = await cdp.captureScreenshot('live_monitor_result');
  console.log('📸 Screenshot:', shot);
  await cdp.close();
}

liveMonitorUpload().catch(e => console.error(e));
