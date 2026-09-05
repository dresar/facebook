const CDPClient = require('./core/cdp');

async function testSmallVideoUpload() {
  const cdp = new CDPClient();
  await cdp.connect();
  await cdp.enableDomains();

  console.log('1. Refreshing composer page...');
  await cdp.navigate('https://business.facebook.com/latest/reels_composer?business_id=622318042872290&asset_id=1305449512649082');
  await cdp.sleep(5000);

  console.log('2. Enabling file chooser intercept...');
  await cdp.send('Page.setInterceptFileChooserDialog', { enabled: true });

  cdp.on('Page.fileChooserOpened', async (params) => {
    console.log('⚡ File Chooser Opened! Injecting test_5s.mp4...');
    await cdp.send('DOM.setFileInputFiles', {
      files: ['C:\\Users\\NCN0C\\Videos\\facebook\\test_5s.mp4'],
      backendNodeId: params.backendNodeId
    });
    console.log('✅ File injected successfully!');
    await cdp.send('Page.setInterceptFileChooserDialog', { enabled: false }).catch(()=>{});
  });

  console.log('3. Clicking [Add video]...');
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

  console.log('4. Monitoring upload progress...');
  for (let i = 1; i <= 20; i++) {
    await cdp.sleep(1500);
    const state = await cdp.eval(`(() => {
      const all = Array.from(document.querySelectorAll('*'));
      const percentEl = all.find(e => (e.innerText || '').includes('%') && (e.innerText||'').length < 10);
      const nextBtn = all.find(e => (e.innerText || '').trim() === 'Next' && e.getAttribute('aria-disabled') !== null);
      return {
        percent: percentEl ? percentEl.innerText : 'none',
        isNextDisabled: nextBtn ? nextBtn.getAttribute('aria-disabled') : 'not found'
      };
    })()`);
    console.log(`[Check ${i}] State:`, state);
    if (state.isNextDisabled === 'false') {
      console.log('🎉 Next button is ENABLED!');
      break;
    }
  }

  const shot = await cdp.captureScreenshot('test_5s_upload_state');
  console.log('📸 Screenshot tersimpan di:', shot);
  await cdp.close();
}

testSmallVideoUpload().catch(e => console.error(e));
