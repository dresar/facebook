const CDPClient = require('./core/cdp');

async function uploadAndSchedule001() {
  const cdp = new CDPClient();
  await cdp.connect();
  await cdp.enableDomains();

  console.log('====================================================');
  console.log('🚀 UPLOAD & JADWALKAN VIDEO 001.mp4 (FULL VERIFIED)');
  console.log('====================================================');

  console.log('1. Mengaktifkan dialog intercept file...');
  await cdp.send('Page.setInterceptFileChooserDialog', { enabled: true });

  let fileAttached = false;
  cdp.on('Page.fileChooserOpened', async (params) => {
    console.log('⚡ File Chooser Terbuka! Menyuntikkan test_faststart_001.mp4...');
    try {
      await cdp.send('DOM.setFileInputFiles', {
        files: ['C:\\Users\\NCN0C\\Videos\\facebook\\test_faststart_001.mp4'],
        backendNodeId: params.backendNodeId
      });
      console.log('✅ File test_faststart_001.mp4 berhasil disuntikkan!');
      fileAttached = true;
      await cdp.send('Page.setInterceptFileChooserDialog', { enabled: false }).catch(()=>{});
    } catch (e) {
      console.error('Error file input:', e.message);
    }
  });

  console.log('2. Mengklik tombol [Add video] pada koordinat (154, 341)...');
  await cdp.dispatchHumanClick(154, 341);

  // Tunggu sampai thumbnail media muncul di halaman
  console.log('3. Menunggu kartu media terpasang di form...');
  for (let i = 1; i <= 15; i++) {
    await cdp.sleep(1000);
    const hasMedia = await cdp.eval(`(() => {
      const text = document.body.innerText || '';
      return text.includes('001') || text.includes('1080 x 1920') || !!document.querySelector('video');
    })()`);
    if (hasMedia) {
      console.log(`✅ Kartu media terdeteksi di detik ke-${i}!`);
      break;
    }
  }

  console.log('4. Mengisi Caption & Link Affiliate Shopee...');
  const focused = await cdp.eval(`(() => {
    const el = document.querySelector('div[role="textbox"], div[contenteditable="true"]');
    if (!el) return null;
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
    el.focus();
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x + 20), y: Math.round(r.y + 20) };
  })()`);

  if (focused) {
    await cdp.dispatchHumanClick(focused.x, focused.y);
    await cdp.sleep(200);
    const caption = "COPET AUTO NANGIS?! Sering was-was pas bawa ransel di tempat rame? Cobain nih, tas ransel anti maling yang #BarangUnik #RacunShopee #SpillBarangUnik\n\nhttps://s.shopee.co.id/W5tdFC4Ks";
    await cdp.send('Input.insertText', { text: caption });
    await cdp.sleep(300);
    await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' });
    await cdp.sleep(200);
    await cdp.dispatchHumanClick(600, 100);
  }

  const shotStep1 = await cdp.captureScreenshot('flow_001_step1_ready');
  console.log('📸 Step 1 Siap:', shotStep1);

  console.log('5. Berpindah ke Step 2 (Edit)...');
  await cdp.eval(`(() => {
    const btns = Array.from(document.querySelectorAll('button, div[role="button"]'))
      .filter(b => (b.textContent||'').trim().toLowerCase() === 'next')
      .sort((a, b) => b.getBoundingClientRect().y - a.getBoundingClientRect().y);
    if (btns.length > 0) btns[0].click();
  })()`);
  await cdp.dispatchHumanClick(1178, 607);
  await cdp.sleep(3000);

  console.log('6. Berpindah ke Step 3 (Share / Jadwalkan)...');
  await cdp.eval(`(() => {
    const btns = Array.from(document.querySelectorAll('button, div[role="button"]'))
      .filter(b => (b.textContent||'').trim().toLowerCase() === 'next')
      .sort((a, b) => b.getBoundingClientRect().y - a.getBoundingClientRect().y);
    if (btns.length > 0) btns[0].click();
  })()`);
  await cdp.dispatchHumanClick(1178, 607);
  await cdp.sleep(3000);

  console.log('7. Memilih opsi Jadwalkan (Schedule) & Mengisi Tanggal/Jam...');
  await cdp.eval(`(() => {
    const els = Array.from(document.querySelectorAll('*'))
      .filter(el => {
        const t = (el.innerText || '').trim().toLowerCase();
        const r = el.getBoundingClientRect();
        return (t === 'schedule' || t === 'jadwalkan') && r.top > 0 && r.top < 450 && r.width > 0;
      });
    if (els.length > 0) els[0].click();
  })()`);
  await cdp.sleep(1500);

  // Set date: 18/08/2026
  const dateInput = await cdp.eval(`(() => {
    const inputs = Array.from(document.querySelectorAll('input[placeholder*="dd/mm"], input[placeholder*="mm/dd"], input[type="date"]'));
    if (inputs.length === 0) return null;
    const r = inputs[0].getBoundingClientRect();
    return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) };
  })()`);

  if (dateInput) {
    await cdp.dispatchHumanClick(dateInput.x, dateInput.y);
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', modifiers: 4, key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65 });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: 4, key: 'a', code: 'KeyA' });
    await cdp.send('Input.insertText', { text: '18/08/2026' });
    await cdp.sleep(150);
  }

  // Set time: 09:00
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
  const shotStep3 = await cdp.captureScreenshot('flow_001_step3_ready_to_schedule');
  console.log('📸 Step 3 Jadwal Siap:', shotStep3);

  console.log('8. Mengklik tombol [Schedule] / [Jadwalkan]...');
  const scheduleBtn = await cdp.eval(`(() => {
    const btns = Array.from(document.querySelectorAll('button, div[role="button"]'))
      .filter(b => {
        const t = (b.textContent || '').trim().toLowerCase();
        return (t === 'schedule' || t === 'jadwalkan') && b.getBoundingClientRect().y > 500;
      })
      .sort((a, b) => b.getBoundingClientRect().y - a.getBoundingClientRect().y);
    if (btns.length === 0) return null;
    const r = btns[0].getBoundingClientRect();
    btns[0].click();
    return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) };
  })()`);

  if (scheduleBtn) {
    await cdp.dispatchHumanClick(scheduleBtn.x, scheduleBtn.y);
  }

  console.log('9. Menangani modal pop-up Reel processing [Done]...');
  for (let m = 1; m <= 15; m++) {
    await cdp.sleep(1000);
    const dismissed = await cdp.eval(`(() => {
      const btns = Array.from(document.querySelectorAll('button, div[role="button"]'))
        .filter(b => (b.innerText || '').trim().toLowerCase() === 'done');
      if (btns.length > 0) {
        btns[0].click();
        return true;
      }
      return false;
    })()`);
    if (dismissed) {
      console.log('✨ Modal pop-up "Reel processing" berhasil diklik [Done]!');
      break;
    }
  }

  await cdp.sleep(4000);
  const shotDone = await cdp.captureScreenshot('flow_001_scheduled_complete');
  console.log('📸 Hasil Akhir Terjadwal:', shotDone);

  await cdp.close();
}

uploadAndSchedule001().catch(e => console.error(e));
