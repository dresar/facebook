const CDPClient = require('./core/cdp');

async function findAddVideoExact() {
  const cdp = new CDPClient();
  await cdp.connect();
  await cdp.enableDomains();

  const details = await cdp.eval(`(() => {
    const all = Array.from(document.querySelectorAll('*'));
    const matches = all.filter(e => (e.innerText || '').trim() === 'Add video');
    return matches.map(e => {
      const r = e.getBoundingClientRect();
      return {
        tag: e.tagName,
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        outerHTML: e.outerHTML.substring(0, 100)
      };
    });
  })()`);

  console.log('Add video elements:', JSON.stringify(details, null, 2));
  await cdp.close();
}

findAddVideoExact().catch(e => console.error(e));
