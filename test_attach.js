const CDPClient = require('./core/cdp');

async function attachVideoOnly() {
  const cdp = new CDPClient();
  await cdp.connect();
  await cdp.enableDomains();

  console.log('1. Intercepting file chooser...');
  await cdp.send('Page.setInterceptFileChooserDialog', { enabled: true });

  cdp.on('Page.fileChooserOpened', async (params) => {
    console.log('⚡ EVENT Page.fileChooserOpened received:', params);
    try {
      const res = await cdp.send('DOM.setFileInputFiles', {
        files: ['C:\\Users\\NCN0C\\Videos\\facebook\\oupot ready\\001.mp4'],
        backendNodeId: params.backendNodeId
      });
      console.log('✅ DOM.setFileInputFiles success:', res);
      await cdp.send('Page.setInterceptFileChooserDialog', { enabled: false }).catch(()=>{});
    } catch (e) {
      console.error('❌ Error setting file:', e.message);
    }
  });

  console.log('2. Clicking Add video button...');
  const addBtn = await cdp.eval(`(() => {
    const btns = Array.from(document.querySelectorAll('button, div[role="button"], div'))
      .filter(el => (el.innerText || '').trim().toLowerCase() === 'add video');
    if (btns.length === 0) return null;
    const b = btns[0];
    const r = b.getBoundingClientRect();
    return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) };
  })()`);

  console.log('Add video button coord:', addBtn);
  if (addBtn) {
    await cdp.dispatchHumanClick(addBtn.x, addBtn.y);
  }

  console.log('3. Waiting 6 seconds for DOM to update with video preview...');
  await cdp.sleep(6000);

  const shot = await cdp.captureScreenshot('manual_attach_result');
  console.log('📸 Screenshot tersimpan di:', shot);
  await cdp.close();
}

attachVideoOnly().catch(e => console.error(e));
