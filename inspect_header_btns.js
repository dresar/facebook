const CDPClient = require('./core/cdp');

async function inspectSplitButton() {
  const cdp = new CDPClient();
  await cdp.connect();
  await cdp.enableDomains();

  const details = await cdp.eval(`(() => {
    // Find all buttons in header
    const btns = Array.from(document.querySelectorAll('button, div[role="button"], a[role="button"]'))
      .filter(b => {
        const r = b.getBoundingClientRect();
        return r.top >= 0 && r.top <= 80 && r.width > 0;
      })
      .map(b => {
        const r = b.getBoundingClientRect();
        return {
          text: b.textContent.trim(),
          ariaLabel: b.getAttribute('aria-label'),
          tag: b.tagName,
          rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
          hasSvg: b.querySelector('svg') !== null
        };
      });
    return btns;
  })()`);

  console.log('Header buttons:', JSON.stringify(details, null, 2));
  await cdp.close();
}

inspectSplitButton().catch(e => console.error(e));
