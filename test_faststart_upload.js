const CDPClient = require('./core/cdp');

async function testFaststartUpload() {
  const cdp = new CDPClient();
  await cdp.connect();
  await cdp.enableDomains();

  console.log('1. Refreshing composer page...');
  const url = 'https://business.facebook.com/latest/reels_composer?business_id=622318042872290&asset_id=1305449512649082';
  await cdp.navigate(url);
  await cdp.sleep(5000);

  console.log('2. Setting up file intercept...');
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

  console.log('4. Entering Caption...');
  await cdp.sleep(2500);
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
    const caption = "COPET AUTO NANGIS?! Sering was-was pas bawa ransel di tempat rame? Cobain nih, tas ransel anti maling yang #BarangUnik #RacunShopee #SpillBarangUnik\n\n🔗 https://s.shopee.co.id/W5tdFC4Ks";
    await cdp.send('Input.insertText', { text: caption });
    await cdp.sleep(300);
    await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' });
    await cdp.sleep(200);
    await cdp.dispatchHumanClick(500, 100);
  }

  console.log('5. Monitoring upload progress...');
  for (let i = 1; i <= 30; i++) {
    await cdp.sleep(2000);
    const p = await cdp.eval(`(() => {
      const all = Array.from(document.querySelectorAll('*'));
      const percentEl = all.find(e => (e.innerText || '').includes('%') && (e.innerText||'').length < 10);
      const toast = all.some(e => (e.innerText || '').includes('Please wait for the media'));
      return { percent: percentEl ? percentEl.innerText : 'done', hasToast: toast };
    })()`);
    console.log(`[Check ${i}] Progress:`, p);

    // Try clicking Next
    const nextBtn = await cdp.eval(`(() => {
      const btns = Array.from(document.querySelectorAll('button, div[role="button"]'))
        .filter(b => (b.textContent||'').trim().toLowerCase() === 'next')
        .sort((a, b) => b.getBoundingClientRect().y - a.getBoundingClientRect().y);
      if (btns.length > 0) {
        btns[0].click();
        return true;
      }
      return false;
    })()`);

    const step = await cdp.eval(`(() => {
      const t = document.body.innerText || '';
      if (t.includes('Schedule date') || t.includes('Publish now')) return 'SHARE';
      if (t.includes('Trim video') || t.includes('Enhance video')) return 'EDIT';
      return 'CREATE';
    })()`);

    console.log(`Step: ${step}`);
    if (step === 'EDIT') {
      console.log('✅ In EDIT step! Clicking Next to SHARE...');
      await cdp.eval(`(() => {
        const btns = Array.from(document.querySelectorAll('button, div[role="button"]'))
          .filter(b => (b.textContent||'').trim().toLowerCase() === 'next')
          .sort((a, b) => b.getBoundingClientRect().y - a.getBoundingClientRect().y);
        if (btns.length > 0) btns[0].click();
      })()`);
      await cdp.sleep(2000);
    } else if (step === 'SHARE') {
      console.log('🎉 In SHARE step!');
      break;
    }
  }

  const shot = await cdp.captureScreenshot('faststart_upload_result');
  console.log('📸 Screenshot tersimpan di:', shot);
  await cdp.close();
}

testFaststartUpload().catch(e => console.error(e));
