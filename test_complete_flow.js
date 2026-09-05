const CDPClient = require('./core/cdp');

async function testCompleteFlowManual() {
  const cdp = new CDPClient();
  await cdp.connect();
  await cdp.enableDomains();

  console.log('1. Setting intercept...');
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

  console.log('2. Clicking [Add video] at (154, 341)...');
  await cdp.dispatchHumanClick(154, 341);
  await cdp.sleep(3000);

  console.log('3. Typing clean plain caption without hashtag dropdown triggering...');
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
    const caption = "COPET AUTO NANGIS?! Sering was-was pas bawa ransel di tempat rame? Cobain nih, tas ransel anti maling yang #BarangUnik #RacunShopee #SpillBarangUnik\n\nhttps://s.shopee.co.id/W5tdFC4Ks";
    await cdp.send('Input.insertText', { text: caption });
    await cdp.sleep(300);
    // Dismiss any dropdowns
    await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' });
    await cdp.sleep(200);
    await cdp.dispatchHumanClick(600, 100);
  }

  console.log('4. Checking Next button status...');
  for (let s = 1; s <= 15; s++) {
    await cdp.sleep(1000);
    const nextInfo = await cdp.eval(`(() => {
      const all = Array.from(document.querySelectorAll('button, div[role="button"], div'));
      const next = all.find(e => (e.innerText || '').trim() === 'Next' && e.getBoundingClientRect().y > 500 && e.getBoundingClientRect().x > 900);
      if (!next) return { found: false };
      const r = next.getBoundingClientRect();
      return {
        found: true,
        disabled: next.getAttribute('aria-disabled'),
        x: Math.round(r.x + r.width/2),
        y: Math.round(r.y + r.height/2)
      };
    })()`);
    console.log(`[Detik ${s}] Next button:`, nextInfo);

    if (nextInfo && nextInfo.found && nextInfo.disabled === 'false') {
      console.log('🎉 Next button is ACTIVE! Clicking Next to Step 2...');
      await cdp.dispatchHumanClick(nextInfo.x, nextInfo.y);
      break;
    }
  }

  await cdp.sleep(3000);
  const shot = await cdp.captureScreenshot('step_flow_verified');
  console.log('📸 Screenshot tersimpan di:', shot);
  await cdp.close();
}

testCompleteFlowManual().catch(e => console.error(e));
