const CDPClient = require('./core/cdp');

async function testSingleVerified() {
  const cdp = new CDPClient();
  await cdp.connect();
  await cdp.enableDomains();

  console.log('1. Setting intercept...');
  await cdp.send('Page.setInterceptFileChooserDialog', { enabled: true });

  cdp.on('Page.fileChooserOpened', async (params) => {
    console.log('⚡ File dialog opened! Injecting test_faststart_001.mp4...');
    await cdp.send('DOM.setFileInputFiles', {
      files: ['C:\\Users\\NCN0C\\Videos\\facebook\\test_faststart_001.mp4'],
      backendNodeId: params.backendNodeId
    });
    console.log('✅ File injected!');
    await cdp.send('Page.setInterceptFileChooserDialog', { enabled: false }).catch(()=>{});
  });

  console.log('2. Clicking [Add video]...');
  await cdp.dispatchHumanClick(154, 341);
  await cdp.sleep(3000);

  console.log('3. Typing clean caption...');
  const focused = await cdp.eval(`(() => {
    const el = document.querySelector('div[role="textbox"], div[contenteditable="true"]');
    if (!el) return null;
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
    el.focus();
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x + 20), y: Math.round(r.y + 20) };
  })()`);

  if (focused) {
    await cdp.dispatchHumanClick(focused.x, focused.y);
    await cdp.sleep(200);
    // Select all and clear
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', modifiers: 4, key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65 });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: 4, key: 'a', code: 'KeyA' });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace' });
    await cdp.sleep(200);

    const caption = "COPET AUTO NANGIS?! Sering was-was pas bawa ransel di tempat rame? Cobain nih, tas ransel anti maling yang #BarangUnik #RacunShopee #SpillBarangUnik\n\nhttps://s.shopee.co.id/W5tdFC4Ks";
    await cdp.send('Input.insertText', { text: caption });
    await cdp.sleep(300);
    await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' });
    await cdp.sleep(200);
    await cdp.dispatchHumanClick(600, 100);
  }

  await cdp.sleep(2000);
  const shot = await cdp.captureScreenshot('verified_step1_ready');
  console.log('📸 Step 1 screenshot:', shot);
  await cdp.close();
}

testSingleVerified().catch(e => console.error(e));
