const CDPClient = require('./core/cdp');

async function testClickDropdown() {
  const cdp = new CDPClient();
  await cdp.connect();
  await cdp.enableDomains();

  const clickTarget = await cdp.eval(`(() => {
    const allBtns = Array.from(document.querySelectorAll('div[role="button"], button'));
    // Find the button with down arrow SVG near Create post
    const createPost = allBtns.find(b => (b.textContent || '').trim().toLowerCase() === 'create post');
    if (!createPost) return { found: false };

    // Look at its container parent
    const container = createPost.parentElement.parentElement;
    const btnsInContainer = Array.from(container.querySelectorAll('div[role="button"], button'));
    const arrowBtn = btnsInContainer.find(b => b !== createPost && b.querySelector('svg') !== null) || btnsInContainer[1];
    
    if (arrowBtn) {
      arrowBtn.click();
      const r = arrowBtn.getBoundingClientRect();
      return { found: true, x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2), w: r.width, h: r.height };
    }
    return { found: false };
  })()`);

  console.log('Arrow click target:', clickTarget);
  if (clickTarget && clickTarget.found) {
    await cdp.dispatchHumanClick(clickTarget.x, clickTarget.y);
  }

  await cdp.sleep(1500);
  const shot = await cdp.captureScreenshot('dropdown_menu_open');
  console.log('Screenshot saved:', shot);
  await cdp.close();
}

testClickDropdown().catch(e => console.error(e));
