const CDPClient = require('./core/cdp');

async function testClickAddVideoDirect() {
  const cdp = new CDPClient();
  await cdp.connect();
  await cdp.enableDomains();

  console.log('1. Intercepting file chooser...');
  await cdp.send('Page.setInterceptFileChooserDialog', { enabled: true });

  cdp.on('Page.fileChooserOpened', async (params) => {
    console.log('🎉 FILE CHOOSER EVENT ARRIVED!', params);
    await cdp.send('DOM.setFileInputFiles', {
      files: ['C:\\Users\\NCN0C\\Videos\\facebook\\oupot ready\\001.mp4'],
      backendNodeId: params.backendNodeId
    });
    console.log('✅ File injected successfully!');
    await cdp.send('Page.setInterceptFileChooserDialog', { enabled: false }).catch(()=>{});
  });

  console.log('2. Triggering click on all elements matching "Add video"...');
  const clicked = await cdp.eval(`(() => {
    const all = Array.from(document.querySelectorAll('*'));
    const match = all.filter(e => (e.innerText || '').trim() === 'Add video' && e.children.length === 0);
    if (match.length === 0) return { found: false };

    const el = match[0];
    let cur = el;
    while (cur && cur !== document.body) {
      cur.click();
      cur = cur.parentElement;
    }
    return { found: true };
  })()`);

  console.log('Clicked result:', clicked);

  for (let i = 1; i <= 8; i++) {
    await cdp.sleep(1000);
    const state = await cdp.eval(`(() => {
      const video = document.querySelector('video');
      const text = Array.from(document.querySelectorAll('*')).map(e => e.textContent||'').filter(t => t.includes('%'));
      return { hasVideo: !!video, percent: text[0] || 'none' };
    })()`);
    console.log(`[Second ${i}]`, JSON.stringify(state));
    if (state.hasVideo) break;
  }

  const shot = await cdp.captureScreenshot('after_add_video_clicked');
  console.log('Shot:', shot);
  await cdp.close();
}

testClickAddVideoDirect().catch(e => console.error(e));
