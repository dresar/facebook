const CDPClient = require('./core/cdp');

async function typeCaptionDirect() {
  const cdp = new CDPClient();
  await cdp.connect();
  await cdp.enableDomains();

  console.log('1. Clicking directly in textbox at (200, 530)...');
  await cdp.dispatchHumanClick(200, 530);
  await cdp.sleep(400);

  const caption = "COPET AUTO NANGIS?! Sering was-was pas bawa ransel di tempat rame? Cobain nih, tas ransel anti maling yang #BarangUnik #RacunShopee #SpillBarangUnik\n\n🔗 https://s.shopee.co.id/W5tdFC4Ks";
  console.log('2. Inserting text via CDP...');
  await cdp.send('Input.insertText', { text: caption });
  await cdp.sleep(500);

  console.log('3. Pressing Escape to dismiss hashtag dropdown...');
  await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' });
  await cdp.sleep(300);

  console.log('4. Clicking outside at (500, 100)...');
  await cdp.dispatchHumanClick(500, 100);
  await cdp.sleep(1500);

  const shot = await cdp.captureScreenshot('step_caption_filled_success');
  console.log('📸 Screenshot tersimpan di:', shot);
  await cdp.close();
}

typeCaptionDirect().catch(e => console.error(e));
