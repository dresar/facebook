const CDPClient = require('./core/cdp');

async function findFooterNext() {
  const cdp = new CDPClient();
  await cdp.connect();
  await cdp.enableDomains();

  const nexts = await cdp.eval(`(() => {
    const all = Array.from(document.querySelectorAll('button, div[role="button"]'));
    const matches = all.filter(e => (e.innerText || '').trim() === 'Next');
    return matches.map(e => {
      const r = e.getBoundingClientRect();
      return {
        tag: e.tagName,
        ariaLabel: e.getAttribute('aria-label'),
        disabled: e.getAttribute('aria-disabled'),
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
      };
    });
  })()`);

  console.log('Footer Next buttons found:', JSON.stringify(nexts, null, 2));

  // Click the bottom-most Next button
  if (nexts.length > 0) {
    const bottomNext = nexts.sort((a, b) => b.rect.y - a.rect.y)[0];
    console.log('Clicking bottom Next at:', bottomNext.rect);
    await cdp.dispatchHumanClick(bottomNext.rect.x + bottomNext.rect.w/2, bottomNext.rect.y + bottomNext.rect.h/2);
  }

  await cdp.sleep(3000);
  const shot = await cdp.captureScreenshot('after_clicking_bottom_next');
  console.log('📸 Screenshot tersimpan di:', shot);
  await cdp.close();
}

findFooterNext().catch(e => console.error(e));
