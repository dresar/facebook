const CDPClient = require('./core/cdp');

async function inspectNextButton() {
  const cdp = new CDPClient();
  await cdp.connect();
  await cdp.enableDomains();

  const nextDetails = await cdp.eval(`(() => {
    const all = Array.from(document.querySelectorAll('button, div[role="button"], span, div'));
    const nextMatches = all.filter(e => (e.innerText || '').trim() === 'Next');
    return nextMatches.map(e => {
      const r = e.getBoundingClientRect();
      return {
        tag: e.tagName,
        ariaLabel: e.getAttribute('aria-label'),
        disabled: e.getAttribute('aria-disabled') || e.disabled,
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        classes: e.className
      };
    });
  })()`);

  console.log('Next button details:', JSON.stringify(nextDetails, null, 2));
  await cdp.close();
}

inspectNextButton().catch(e => console.error(e));
