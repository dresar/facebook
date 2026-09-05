const CDPClient = require('./core/cdp');

async function inspectDropdown() {
  const cdp = new CDPClient();
  await cdp.connect();
  await cdp.enableDomains();

  const res = await cdp.eval(`(() => {
    // Find Create post button
    const allBtns = Array.from(document.querySelectorAll('button, div[role="button"], a[role="button"]'));
    const createPostBtn = allBtns.find(b => (b.textContent || '').trim().toLowerCase() === 'create post');
    
    let dropdownBtn = null;
    if (createPostBtn) {
      // The dropdown arrow is right next to create post, or inside its parent group
      const parent = createPostBtn.parentElement;
      const siblings = Array.from(parent ? parent.querySelectorAll('button, div[role="button"], div') : []);
      dropdownBtn = siblings.find(s => s !== createPostBtn && s.querySelector('svg') !== null);
      
      const rCP = createPostBtn.getBoundingClientRect();
      const rDD = dropdownBtn ? dropdownBtn.getBoundingClientRect() : null;
      return {
        createPost: { x: Math.round(rCP.x), y: Math.round(rCP.y), w: Math.round(rCP.width), h: Math.round(rCP.height) },
        dropdown: rDD ? { x: Math.round(rDD.x), y: Math.round(rDD.y), w: Math.round(rDD.width), h: Math.round(rDD.height) } : null
      };
    }
    return null;
  })()`);

  console.log('Dropdown detection:', JSON.stringify(res, null, 2));
  await cdp.close();
}

inspectDropdown().catch(e => console.error(e));
