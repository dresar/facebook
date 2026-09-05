const CDPClient = require('./core/cdp');

async function proceedToStep3() {
  const cdp = new CDPClient();
  await cdp.connect();
  await cdp.enableDomains();

  console.log('1. Clicking Next from Step 1 (Create) to Step 2 (Edit)...');
  const next1 = await cdp.eval(`(() => {
    const btns = Array.from(document.querySelectorAll('button, div[role="button"]'))
      .filter(b => (b.textContent||'').trim().toLowerCase() === 'next')
      .sort((a, b) => b.getBoundingClientRect().y - a.getBoundingClientRect().y);
    if (btns.length === 0) return null;
    const r = btns[0].getBoundingClientRect();
    btns[0].click();
    return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) };
  })()`);

  if (next1) {
    await cdp.dispatchHumanClick(next1.x, next1.y);
  }

  await cdp.sleep(3000);
  const shotStep2 = await cdp.captureScreenshot('step2_edit_screen');
  console.log('📸 Step 2 screenshot:', shotStep2);

  console.log('2. Clicking Next from Step 2 (Edit) to Step 3 (Share)...');
  const next2 = await cdp.eval(`(() => {
    const btns = Array.from(document.querySelectorAll('button, div[role="button"]'))
      .filter(b => (b.textContent||'').trim().toLowerCase() === 'next')
      .sort((a, b) => b.getBoundingClientRect().y - a.getBoundingClientRect().y);
    if (btns.length === 0) return null;
    const r = btns[0].getBoundingClientRect();
    btns[0].click();
    return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) };
  })()`);

  if (next2) {
    await cdp.dispatchHumanClick(next2.x, next2.y);
  }

  await cdp.sleep(3000);

  console.log('3. Activating Schedule mode and setting 18/08/2026 09:00 WIB...');
  // Click Schedule radio
  await cdp.eval(`(() => {
    const radios = Array.from(document.querySelectorAll('div[role="radio"], input[type="radio"], label, span, div'))
      .filter(el => {
        const t = (el.textContent || '').trim().toLowerCase();
        const r = el.getBoundingClientRect();
        return (t === 'schedule' || t === 'jadwalkan') && r.top < 450 && r.width > 0;
      });
    if (radios.length > 0) radios[0].click();
  })()`);

  await cdp.sleep(1500);

  // Set date
  const dateInput = await cdp.eval(`(() => {
    const inputs = Array.from(document.querySelectorAll('input[placeholder*="dd/mm"], input[placeholder*="mm/dd"], input[type="date"]'));
    if (inputs.length === 0) return null;
    const r = inputs[0].getBoundingClientRect();
    return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) };
  })()`);

  if (dateInput) {
    await cdp.dispatchHumanClick(dateInput.x, dateInput.y);
    await cdp.sleep(150);
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', modifiers: 4, key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65 });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: 4, key: 'a', code: 'KeyA' });
    await cdp.send('Input.insertText', { text: '18/08/2026' });
    await cdp.sleep(200);
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab' });
  }

  // Set time 09:00
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
    await cdp.sleep(200);

    if (timeInputs.m) {
      await cdp.dispatchHumanClick(timeInputs.m.x, timeInputs.m.y);
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', modifiers: 4, key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65 });
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: 4, key: 'a', code: 'KeyA' });
      await cdp.send('Input.insertText', { text: '00' });
      await cdp.sleep(200);
    }
  }

  await cdp.sleep(2000);
  const shotStep3 = await cdp.captureScreenshot('step3_schedule_ready');
  console.log('📸 Step 3 (Schedule Ready) screenshot:', shotStep3);
  await cdp.close();
}

proceedToStep3().catch(e => console.error(e));
