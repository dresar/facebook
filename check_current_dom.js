const CDPClient = require('./core/cdp');

async function checkCurrentDom() {
  const cdp = new CDPClient();
  await cdp.connect();
  await cdp.enableDomains();

  const info = await cdp.eval(`(() => {
    const all = Array.from(document.querySelectorAll('*'));
    const percentEl = all.find(e => (e.innerText || '').includes('%'));
    const waitToast = all.some(e => (e.innerText || '').includes('Please wait for the media'));
    const nextBtn = all.find(e => (e.innerText || '').trim().toLowerCase() === 'next');
    return {
      percent: percentEl ? percentEl.innerText : 'none',
      hasWaitToast: waitToast,
      nextBtnFound: !!nextBtn
    };
  })()`);

  console.log('Current DOM state:', info);
  const shot = await cdp.captureScreenshot('current_dom_state');
  console.log('Shot:', shot);
  await cdp.close();
}

checkCurrentDom().catch(e => console.error(e));
