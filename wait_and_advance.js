const CDPClient = require('./core/cdp');

async function waitUploadAndAdvance() {
  const cdp = new CDPClient();
  await cdp.connect();
  await cdp.enableDomains();

  console.log('⏳ Memantau proses upload media Facebook sampai 100% tuntas...');
  for (let sec = 1; sec <= 60; sec++) {
    const info = await cdp.eval(`(() => {
      const allText = Array.from(document.querySelectorAll('*'))
        .map(e => (e.textContent || '').trim())
        .filter(t => t.includes('%') && t.length < 10);
      
      const toast = Array.from(document.querySelectorAll('*'))
        .some(e => (e.textContent || '').includes('Please wait for the media'));
      
      return {
        percent: allText[0] || '100% / Done',
        hasWaitToast: toast
      };
    })()`);

    console.log(`[Detik ${sec}] Status:`, JSON.stringify(info));

    // Try clicking Next
    const clickedNext = await cdp.eval(`(() => {
      const btns = Array.from(document.querySelectorAll('button, div[role="button"]'))
        .filter(b => (b.textContent||'').trim().toLowerCase() === 'next')
        .sort((a, b) => b.getBoundingClientRect().y - a.getBoundingClientRect().y);
      if (btns.length > 0) {
        btns[0].click();
        return true;
      }
      return false;
    })()`);

    await cdp.sleep(2000);

    // Check if we moved to Edit or Share step
    const currentStep = await cdp.eval(`(() => {
      const text = document.body.innerText || '';
      if (text.includes('Schedule') && (text.includes('Schedule date') || text.includes('Publish now'))) {
        return 'SHARE_STEP';
      }
      if (text.includes('Trim video') || text.includes('Audio') || text.includes('Enhance video')) {
        return 'EDIT_STEP';
      }
      return 'CREATE_STEP';
    })()`);

    console.log(`📍 Posisi Step saat ini: ${currentStep}`);

    if (currentStep === 'EDIT_STEP') {
      console.log('✅ Berhasil masuk ke Step 2 (Edit)! Mengklik Next lagi untuk ke Step 3 (Share)...');
      await cdp.eval(`(() => {
        const btns = Array.from(document.querySelectorAll('button, div[role="button"]'))
          .filter(b => (b.textContent||'').trim().toLowerCase() === 'next')
          .sort((a, b) => b.getBoundingClientRect().y - a.getBoundingClientRect().y);
        if (btns.length > 0) btns[0].click();
      })()`);
      await cdp.sleep(2500);
    } else if (currentStep === 'SHARE_STEP') {
      console.log('🎉 Berhasil masuk ke Step 3 (Share / Jadwalkan)!');
      break;
    }
  }

  const shot = await cdp.captureScreenshot('step_now_at_share');
  console.log('📸 Screenshot tersimpan di:', shot);
  await cdp.close();
}

waitUploadAndAdvance().catch(e => console.error(e));
