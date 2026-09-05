const CDPClient = require('./core/cdp');

async function attachNow() {
  const cdp = new CDPClient();
  await cdp.connect();
  await cdp.enableDomains();

  console.log('1. Setting intercept file chooser...');
  await cdp.send('Page.setInterceptFileChooserDialog', { enabled: true });

  cdp.on('Page.fileChooserOpened', async (params) => {
    console.log('⚡ File Chooser Opened! Injecting test_faststart_001.mp4...');
    await cdp.send('DOM.setFileInputFiles', {
      files: ['C:\\Users\\NCN0C\\Videos\\facebook\\test_faststart_001.mp4'],
      backendNodeId: params.backendNodeId
    });
    console.log('✅ File injected successfully!');
    await cdp.send('Page.setInterceptFileChooserDialog', { enabled: false }).catch(()=>{});
  });

  console.log('2. Clicking [Add video]...');
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

  console.log('3. Waiting 6 seconds for video preview...');
  await cdp.sleep(6000);

  const shot = await cdp.captureScreenshot('faststart_attached_live');
  console.log('📸 Screenshot tersimpan di:', shot);
  await cdp.close();
}

attachNow().catch(e => console.error(e));
