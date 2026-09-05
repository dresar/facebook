const CDPClient = require('./core/cdp');

async function testDispatchChange() {
  const cdp = new CDPClient();
  await cdp.connect();
  await cdp.enableDomains();

  console.log('1. Navigating fresh to Reels Composer...');
  await cdp.navigate('https://business.facebook.com/latest/reels_composer?business_id=622318042872290&asset_id=1305449512649082');
  await cdp.sleep(5000);

  console.log('2. Enabling file chooser intercept...');
  await cdp.send('Page.setInterceptFileChooserDialog', { enabled: true });

  let targetBackendId = null;
  cdp.on('Page.fileChooserOpened', async (params) => {
    console.log('⚡ File Chooser Opened! params:', params);
    targetBackendId = params.backendNodeId;
    await cdp.send('DOM.setFileInputFiles', {
      files: ['C:\\Users\\NCN0C\\Videos\\facebook\\test_faststart_001.mp4'],
      backendNodeId: params.backendNodeId
    });
    console.log('✅ DOM.setFileInputFiles called!');
    await cdp.send('Page.setInterceptFileChooserDialog', { enabled: false }).catch(()=>{});
  });

  console.log('3. Clicking Add video button...');
  const addBtn = await cdp.eval(`(() => {
    const btns = Array.from(document.querySelectorAll('button, div[role="button"], div'))
      .filter(el => (el.innerText || '').trim().toLowerCase() === 'add video');
    if (btns.length === 0) return null;
    const b = btns[0];
    const r = b.getBoundingClientRect();
    return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) };
  })()`);

  if (addBtn) {
    await cdp.dispatchHumanClick(addBtn.x, addBtn.y);
  }

  await cdp.sleep(1000);

  console.log('4. Dispatching input and change events on all file inputs...');
  await cdp.eval(`(() => {
    const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
    fileInputs.forEach(input => {
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  })()`);

  console.log('5. Monitoring upload and Next button status...');
  for (let i = 1; i <= 20; i++) {
    await cdp.sleep(1500);
    const status = await cdp.eval(`(() => {
      const all = Array.from(document.querySelectorAll('*'));
      const nextBtn = all.find(e => (e.innerText || '').trim() === 'Next' && e.getAttribute('aria-disabled') !== null);
      const isNextDisabled = nextBtn ? nextBtn.getAttribute('aria-disabled') : 'not found';
      const percentEl = all.find(e => (e.innerText || '').includes('%') && (e.innerText||'').length < 10);
      return {
        isNextDisabled,
        percent: percentEl ? percentEl.innerText : 'none'
      };
    })()`);
    console.log(`[Second ${i*1.5}] Status:`, status);
    if (status.isNextDisabled === 'false') {
      console.log('🎉 NEXT BUTTON IS ENABLED!');
      break;
    }
  }

  const shot = await cdp.captureScreenshot('change_event_test_result');
  console.log('📸 Screenshot tersimpan di:', shot);
  await cdp.close();
}

testDispatchChange().catch(e => console.error(e));
