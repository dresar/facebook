const CDPClient = require('./core/cdp');

async function typeCaptionLexical() {
  const cdp = new CDPClient();
  await cdp.connect();
  await cdp.enableDomains();

  console.log('1. Focusing textbox element directly via JS...');
  const focused = await cdp.eval(`(() => {
    const el = document.querySelector('div[role="textbox"], div[contenteditable="true"], textarea');
    if (!el) return { found: false };
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
    el.focus();
    const r = el.getBoundingClientRect();
    return { found: true, x: Math.round(r.x + 20), y: Math.round(r.y + 20), tag: el.tagName };
  })()`);

  console.log('Focused target:', focused);

  if (focused && focused.found) {
    await cdp.dispatchHumanClick(focused.x, focused.y);
    await cdp.sleep(300);

    const caption = "COPET AUTO NANGIS?! Sering was-was pas bawa ransel di tempat rame? Cobain nih, tas ransel anti maling yang #BarangUnik #RacunShopee #SpillBarangUnik\n\n🔗 https://s.shopee.co.id/W5tdFC4Ks";
    console.log('2. Inserting text via Input.insertText...');
    await cdp.send('Input.insertText', { text: caption });
    await cdp.sleep(500);

    console.log('3. Pressing Escape...');
    await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' });
    await cdp.sleep(300);
    await cdp.dispatchHumanClick(500, 100);
  }

  await cdp.sleep(1500);
  const shot = await cdp.captureScreenshot('step_caption_lexical_done');
  console.log('📸 Screenshot tersimpan di:', shot);
  await cdp.close();
}

typeCaptionLexical().catch(e => console.error(e));
