const CDPClient = require('./core/cdp');

async function typeCaptionOnly() {
  const cdp = new CDPClient();
  await cdp.connect();
  await cdp.enableDomains();

  console.log('1. Scrolling and clicking textbox...');
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

    const caption = "COPET AUTO NANGIS?! Sering was-was pas bawa ransel di tempat rame? Cobain nih, tas ransel anti maling yang #BarangUnik #RacunShopee #SpillBarangUnik\n\n🔗 https://s.shopee.co.id/W5tdFC4Ks";
    await cdp.send('Input.insertText', { text: caption });
    await cdp.sleep(500);

    // Escape hashtag popup
    await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' });
    await cdp.sleep(300);
    await cdp.dispatchHumanClick(500, 100);
  }

  await cdp.sleep(2000);
  const shot = await cdp.captureScreenshot('step3_caption_typed');
  console.log('📸 Screenshot tersimpan di:', shot);
  await cdp.close();
}

typeCaptionOnly().catch(e => console.error(e));
