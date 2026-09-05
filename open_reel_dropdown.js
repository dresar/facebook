const CDPClient = require('./core/cdp');

async function openReelFromDropdown() {
  const cdp = new CDPClient();
  await cdp.connect();
  await cdp.enableDomains();

  console.log('1. Mencari tombol dropdown panah [▼] di samping "Create post"...');
  const arrow = await cdp.eval(`(() => {
    const all = Array.from(document.querySelectorAll('button, div[role="button"]'));
    const createPost = all.find(e => (e.innerText || '').trim().toLowerCase() === 'create post');
    if (!createPost) return null;
    const parent = createPost.parentElement;
    const btns = Array.from(parent.querySelectorAll('button, div[role="button"]'));
    const arrowBtn = btns.find(b => b !== createPost) || btns[1];
    if (!arrowBtn) return null;
    const r = arrowBtn.getBoundingClientRect();
    return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) };
  })()`);

  console.log('Dropdown arrow coord:', arrow);
  if (arrow) {
    await cdp.dispatchHumanClick(arrow.x, arrow.y);
  }

  await cdp.sleep(1500);

  console.log('2. Mencari opsi menu "Create reel"...');
  const menuReel = await cdp.eval(`(() => {
    const items = Array.from(document.querySelectorAll('div[role="menuitem"], span, div'))
      .filter(el => (el.innerText || '').trim().toLowerCase() === 'create reel');
    if (items.length === 0) return null;
    const r = items[0].getBoundingClientRect();
    return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) };
  })()`);

  console.log('Create reel menu coord:', menuReel);
  if (menuReel) {
    await cdp.dispatchHumanClick(menuReel.x, menuReel.y);
  }

  await cdp.sleep(4000);
  const shot = await cdp.captureScreenshot('reels_composer_from_dropdown');
  console.log('📸 Screenshot tersimpan di:', shot);
  await cdp.close();
}

openReelFromDropdown().catch(e => console.error(e));
