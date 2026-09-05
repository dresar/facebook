const CDPClient = require('./core/cdp');

async function proceedAndSchedule() {
  const cdp = new CDPClient();
  await cdp.connect();
  await cdp.enableDomains();

  console.log('1. Clicking Next to Step 2 (Edit)...');
  const next1 = await cdp.eval(`(() => {
    const btns = Array.from(document.querySelectorAll('button, div[role="button"]'))
      .filter(b => (b.textContent||'').trim().toLowerCase() === 'next')
      .sort((a, b) => b.getBoundingClientRect().y - a.getBoundingClientRect().y);
    if (btns.length === 0) return null;
    const r = btns[0].getBoundingClientRect();
    return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) };
  })()`);

  if (next1) {
    await cdp.dispatchHumanClick(next1.x, next1.y);
  }

  await cdp.sleep(3000);

  console.log('2. Clicking Next to Step 3 (Share)...');
  const next2 = await cdp.eval(`(() => {
    const btns = Array.from(document.querySelectorAll('button, div[role="button"]'))
      .filter(b => (b.textContent||'').trim().toLowerCase() === 'next')
      .sort((a, b) => b.getBoundingClientRect().y - a.getBoundingClientRect().y);
    if (btns.length === 0) return null;
    const r = btns[0].getBoundingClientRect();
    return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) };
  })()`);

  if (next2) {
    await cdp.dispatchHumanClick(next2.x, next2.y);
  }

  await cdp.sleep(3000);

  console.log('3. Clicking Schedule radio button...');
  const scheduleRadio = await cdp.eval(`(() => {
    const els = Array.from(document.querySelectorAll('*'))
      .filter(el => {
        const t = (el.innerText || '').trim().toLowerCase();
        const r = el.getBoundingClientRect();
        return (t === 'schedule' || t === 'jadwalkan') && r.top > 0 && r.top < 450 && r.width > 0;
      });
    if (els.length === 0) return null;
    const r = els[0].getBoundingClientRect();
    els[0].click();
    return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) };
  })()`);

  if (scheduleRadio) {
    await cdp.dispatchHumanClick(scheduleRadio.x, scheduleRadio.y);
  }

  await cdp.sleep(1500);

  console.log('4. Entering Date 18/08/2026...');
  const dateInput = await cdp.eval(`(() => {
    const inputs = Array.from(document.querySelectorAll('input[placeholder*="dd/mm"], input[placeholder*="mm/dd"], input[type="date"]'));
    if (inputs.length === 0) return null;
    const r = inputs[0].getBoundingClientRect();
    return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) };
  })()`);

  if (dateInput) {
    await cdp.dispatchHumanClick(dateInput.x, dateInput.y);
    await cdp.sleep(100);
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', modifiers: 4, key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65 });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: 4, key: 'a', code: 'KeyA' });
    await cdp.send('Input.insertText', { text: '18/08/2026' });
    await cdp.sleep(150);
  }

  console.log('5. Entering Time 09:00...');
  const timeInputs = await cdp.eval(`(() => {
    const hours = Array.from(document.querySelectorAll('input[aria-label="hours"]'));
    const mins = Array.from(document.querySelectorAll('input[aria-label="minutes"]'));
    const h = hours[0], m = mins[0];
    return {
      h: h ? { x: Math.round(h.getBoundingClientRect().x + h.getBoundingClientRect().width/2), y: Math.round(h.getBoundingClientRect().y + h.getBoundingClientRect().height/2) } : null,
      m: m ? { x: Math.round(m.getBoundingClientRect().x + m.getBoundingClientRect().width/2), y: Math.round(m.getBoundingClientRect().y + m.getBoundingClientRect().height/2) } : null
    };
  })()`);

  if (timeInputs && timeInputs.h) {
    await cdp.dispatchHumanClick(timeInputs.h.x, timeInputs.h.y);
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', modifiers: 4, key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65 });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: 4, key: 'a', code: 'KeyA' });
    await cdp.send('Input.insertText', { text: '09' });
    await cdp.sleep(150);

    if (timeInputs.m) {
      await cdp.dispatchHumanClick(timeInputs.m.x, timeInputs.m.y);
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', modifiers: 4, key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65 });
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: 4, key: 'a', code: 'KeyA' });
      await cdp.send('Input.insertText', { text: '00' });
      await cdp.sleep(150);
    }
  }

  await cdp.sleep(2000);
  const shot = await cdp.captureScreenshot('step3_ready_to_submit');
  console.log('📸 Screenshot tersimpan di:', shot);
  await cdp.close();
}

proceedAndSchedule().catch(e => console.error(e));
