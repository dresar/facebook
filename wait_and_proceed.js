const CDPClient = require('./core/cdp');

async function waitAndProceedToEnd() {
  const cdp = new CDPClient();
  await cdp.connect();
  await cdp.enableDomains();

  console.log('⏳ Menunggu upload video di latar belakang selesai diproses Facebook...');
  let reachedShare = false;

  for (let round = 1; round <= 60; round++) {
    await cdp.sleep(2500);

    const status = await cdp.eval(`(() => {
      const all = Array.from(document.querySelectorAll('*'));
      const toast = all.some(e => (e.innerText || '').includes('Please wait for the media'));
      const nextBtn = all.find(e => (e.innerText || '').trim() === 'Next' && e.getBoundingClientRect().y > 500 && e.getBoundingClientRect().x > 900);
      const isNextDisabled = nextBtn ? nextBtn.getAttribute('aria-disabled') : 'none';
      const pageText = document.body.innerText || '';
      
      let step = 'CREATE';
      if (pageText.includes('Schedule date') || pageText.includes('Publish now')) step = 'SHARE';
      else if (pageText.includes('Trim video') || pageText.includes('Enhance video') || pageText.includes('Edit video')) step = 'EDIT';

      return {
        step,
        hasToast: toast,
        isNextDisabled
      };
    })()`);

    console.log(`[Cek ${round}] Status:`, JSON.stringify(status));

    if (status.step === 'SHARE') {
      console.log('🎉 Sudah berada di Step 3 (Share)!');
      reachedShare = true;
      break;
    }

    // Try clicking Next if not disabled
    if (status.isNextDisabled !== 'true') {
      console.log('👉 Mengklik tombol Next...');
      await cdp.eval(`(() => {
        const all = Array.from(document.querySelectorAll('button, div[role="button"]'));
        const next = all.find(e => (e.innerText || '').trim() === 'Next' && e.getBoundingClientRect().y > 500 && e.getBoundingClientRect().x > 900);
        if (next) next.click();
      })()`);
      await cdp.dispatchHumanClick(1178, 607);
    }
  }

  const shot = await cdp.captureScreenshot('wait_and_proceed_state');
  console.log('📸 Screenshot tersimpan di:', shot);
  await cdp.close();
}

waitAndProceedToEnd().catch(e => console.error(e));
