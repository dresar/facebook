const CDPClient = require('./core/cdp');

async function runStep1() {
  const cdp = new CDPClient();
  await cdp.connect();
  await cdp.enableDomains();

  console.log('1. Setting intercept file chooser...');
  await cdp.send('Page.setInterceptFileChooserDialog', { enabled: true });

  let fileInjected = false;
  cdp.on('Page.fileChooserOpened', async (params) => {
    console.log('⚡ Event fileChooserOpened received! Injecting 001.mp4...');
    try {
      await cdp.send('DOM.setFileInputFiles', {
        files: ['C:\\Users\\NCN0C\\Videos\\facebook\\oupot ready\\001.mp4'],
        backendNodeId: params.backendNodeId
      });
      console.log('✅ File 001.mp4 berhasil disuntikkan ke input browser!');
      fileInjected = true;
      await cdp.send('Page.setInterceptFileChooserDialog', { enabled: false }).catch(() => {});
    } catch (err) {
      console.error('❌ Error setting file:', err.message);
    }
  });

  console.log('2. Mengklik tombol [Add video]...');
  const addBtn = await cdp.eval(`(() => {
    const btns = Array.from(document.querySelectorAll('button, div[role="button"]'))
      .filter(el => (el.innerText || '').trim().toLowerCase() === 'add video');
    if (btns.length === 0) return null;
    const b = btns[0];
    const r = b.getBoundingClientRect();
    return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) };
  })()`);

  if (addBtn) {
    await cdp.dispatchHumanClick(addBtn.x, addBtn.y);
  }

  console.log('3. Mengisi caption...');
  await cdp.sleep(3000);
  const box = await cdp.eval(`(() => {
    const el = document.querySelector('div[role="textbox"]');
    if (!el) return null;
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x + 30), y: Math.round(r.y + 20) };
  })()`);

  if (box) {
    await cdp.dispatchHumanClick(box.x, box.y);
    await cdp.sleep(300);
    const captionText = 'COPET AUTO NANGIS?! Sering was-was pas bawa ransel di tempat rame? Cobain nih, tas ransel anti maling yang #BarangUnik #RacunShopee #SpillBarangUnik\n\n🔗 https://s.shopee.co.id/W5tdFC4Ks';
    await cdp.send('Input.insertText', { text: captionText });
    await cdp.sleep(500);
    await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' });
    await cdp.sleep(300);
    await cdp.dispatchHumanClick(500, 100);
  }

  await cdp.sleep(2000);
  const shot = await cdp.captureScreenshot('step2_video_and_caption_added');
  console.log('📸 Screenshot tersimpan di:', shot);
  await cdp.close();
}

runStep1().catch(e => console.error(e));
