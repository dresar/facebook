const CDPClient = require('./core/cdp');

async function clickNextOnce() {
  const cdp = new CDPClient();
  await cdp.connect();
  await cdp.enableDomains();

  console.log('1. Clicking Next at (1177, 607)...');
  await cdp.dispatchHumanClick(1177, 607);
  await cdp.sleep(3000);

  const state = await cdp.eval(`(() => {
    return {
      text: (document.body.innerText || '').substring(0, 300),
      topTab: Array.from(document.querySelectorAll('div[role="tab"], div[role="radio"], span')).map(e => e.innerText).filter(t => t && (t.includes('Create') || t.includes('Edit') || t.includes('Share')))
    };
  })()`);

  console.log('State after clicking Next:', JSON.stringify(state, null, 2));
  const shot = await cdp.captureScreenshot('after_click_next_live');
  console.log('Shot:', shot);
  await cdp.close();
}

clickNextOnce().catch(e => console.error(e));
