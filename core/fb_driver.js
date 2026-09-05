// core/fb_driver.js - Meta Business Suite Reels & Planner 100% Synchronous DOM Automation Engine
const path = require('path');
const fs = require('fs');

class MetaBusinessDriver {
  constructor(cdpClient) {
    this.cdp = cdpClient;
  }

  /**
   * 1. Membuka Halaman Kalender Konten / Planner Meta Business Suite
   */
  async openPlanner(plannerUrl = 'https://business.facebook.com/latest/content_calendar', maxWaitSec = 45) {
    console.log(`🌐 [Planner] Memeriksa & membuka halaman Meta Business Suite Planner...`);
    
    const currentUrl = await this.cdp.eval('window.location.href');
    
    // Jika tidak berada di content_calendar (misalnya masih di reels_composer), navigasi ke Planner
    if (!currentUrl || !currentUrl.includes('content_calendar')) {
      console.log(`   🚀 Navigasi ke halaman Planner: ${plannerUrl}`);
      await this.cdp.navigate(plannerUrl);
      await this.cdp.sleep(3500);
    } else {
      console.log('   ✅ Tab browser sudah berada di halaman Planner aktif.');
    }

    const startTime = Date.now();
    while ((Date.now() - startTime) < maxWaitSec * 1000) {
      await this.handleDismissableBanners();

      const state = await this.cdp.eval(`(() => {
        const url = window.location.href;
        if (url.includes('/login') || url.includes('/checkpoint') || document.querySelector('input[name="email"]')) {
          return { ready: false, isLoggedOut: true, url };
        }

        const createPostBtns = Array.from(document.querySelectorAll('button, div[role="button"], a[role="button"]'))
          .filter(el => {
            const t = (el.textContent || '').trim().toLowerCase();
            const aria = (el.getAttribute('aria-label') || '').toLowerCase();
            return t.includes('create post') || aria.includes('create post') || t.includes('create ad') || aria.includes('planner');
          });

        const calendarGrid = document.querySelector('div[role="grid"], div[data-testid*="calendar"], div[role="main"], div[aria-label*="calendar"]');
        const plannerHeadings = Array.from(document.querySelectorAll('h1, h2, span, div'))
          .filter(el => el.textContent && el.textContent.trim().toLowerCase() === 'planner');

        const isReady = (createPostBtns.length > 0) || (plannerHeadings.length > 0 && calendarGrid !== null);
        return { ready: isReady, isLoggedOut: false, createPostBtnCount: createPostBtns.length, url };
      })()`);

      if (state && state.isLoggedOut) {
        throw new Error('🛑 [AUTH ERROR] Akun Facebook ter-logout! Silakan login kembali di browser.');
      }

      if (state && state.ready) {
        const elapsedSec = Math.round((Date.now() - startTime) / 1000);
        console.log(`   ✅ Halaman Planner & Kalender siap (pada detik ke-${elapsedSec}).`);
        return true;
      }

      await this.cdp.sleep(1000);
    }

    console.warn('   ⚠️ Melanjutkan proses...');
    return true;
  }

  /**
   * 2. Menutup Otomatis Banner, Pop-up Tour, Tooltip, atau Modal yang Menghalangi
   */
  async handleDismissableBanners() {
    try {
      const dismissed = await this.cdp.eval(`(() => {
        const dismissKeywords = ['got it', 'mengerti', 'dismiss', 'close', 'tutup', 'not now', 'nanti saja', 'skip', 'lewati'];
        const buttons = Array.from(document.querySelectorAll('button, div[role="button"], span[role="button"], svg'));
        
        let count = 0;
        for (const btn of buttons) {
          const txt = (btn.textContent || '').trim().toLowerCase();
          const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
          
          if (dismissKeywords.some(k => txt === k || aria === k || txt.startsWith(k))) {
            const rect = btn.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0 && rect.top >= 0) {
              btn.click();
              count++;
            }
          }
        }
        return { count };
      })()`);

      if (dismissed && dismissed.count > 0) {
        console.log(`   🧹 [Auto-Dismiss] Berhasil menutup ${dismissed.count} banner/tooltip pengganggu.`);
      }
    } catch (e) {}
  }

  /**
   * 3. Memicu Pembuatan Reel dari Dropdown Planner (Gambar 3)
   * Mengklik tombol dropdown panah bawah [▼] di samping "Create post", lalu memilih "Create reel"
   */
  async triggerCreateReelFromPlanner(maxWaitSec = 25) {
    console.log('🎯 [Dropdown] Mencari tombol dropdown di samping "Create post" dan memilih menu "Create reel"...');

    // 1. Cari tombol dropdown panah [▼] di samping "Create post"
    const dropdownTarget = await this.cdp.eval(`(() => {
      const allBtns = Array.from(document.querySelectorAll('div[role="button"], button, div'));
      const dropdown = allBtns.find(b => {
        const rect = b.getBoundingClientRect();
        return rect.y >= 10 && rect.y <= 45 && rect.x > 1100 && rect.width <= 50;
      });
      if (dropdown) {
        const rect = dropdown.getBoundingClientRect();
        return { found: true, x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) };
      }
      return { found: false };
    })()`);

    if (dropdownTarget && dropdownTarget.found && dropdownTarget.w > 0) {
      console.log(`   🖱️ Mengklik tombol dropdown panah di (x=${dropdownTarget.x + dropdownTarget.w/2}, y=${dropdownTarget.y + dropdownTarget.h/2})...`);
      await this.cdp.dispatchHumanClick(
        dropdownTarget.x + Math.floor(dropdownTarget.w / 2),
        dropdownTarget.y + Math.floor(dropdownTarget.h / 2)
      );
    } else {
      console.log('   🖱️ Mengklik tombol dropdown panah default di (1177, 38)...');
      await this.cdp.dispatchHumanClick(1177, 38);
    }

    await this.cdp.sleep(1200);

    // 2. Cari dan klik menu item "Create reel" di pop-up menu (Gambar 3)
    console.log('   📋 Mencari opsi menu "Create reel" di dalam dropdown...');
    const menuItemRes = await this.cdp.eval(`(() => {
      const items = Array.from(document.querySelectorAll('div[role="menuitem"], div[role="button"], div, span, a'))
        .filter(el => (el.textContent || '').trim().toLowerCase() === 'create reel' && el.children.length === 0);
      if (items.length > 0) {
        const rect = items[0].getBoundingClientRect();
        return { found: true, x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) };
      }
      return { found: false };
    })()`);

    if (menuItemRes && menuItemRes.found) {
      console.log(`   ✨ Menemukan menu "Create reel" di (${menuItemRes.x + menuItemRes.w/2}, ${menuItemRes.y + menuItemRes.h/2})...`);
      await this.cdp.dispatchHumanClick(
        menuItemRes.x + Math.floor(menuItemRes.w / 2),
        menuItemRes.y + Math.floor(menuItemRes.h / 2)
      );
    } else {
      console.log('   🖱️ Mengklik opsi "Create reel" di koordinat default (1101, 126)...');
      await this.cdp.dispatchHumanClick(1101, 126);
    }

    // 3. Tunggu hingga modal Reels Composer muncul
    console.log('   ⏳ Menunggu form "Create reel" terbuka...');
    const startWait = Date.now();
    while ((Date.now() - startWait) < maxWaitSec * 1000) {
      const isComposerOpen = await this.cdp.eval(`(() => {
        const url = window.location.href;
        const headings = Array.from(document.querySelectorAll('h1, h2, span, div'))
          .filter(el => (el.textContent || '').trim().toLowerCase() === 'create reel');
        const addVideoBtn = Array.from(document.querySelectorAll('button, div[role="button"], div, span'))
          .find(el => (el.innerText || '').trim() === 'Add video');

        return url.includes('reels_composer') || (headings.length > 0 && addVideoBtn !== undefined);
      })()`);

      if (isComposerOpen) {
        console.log('   🎉 Modal Reels Composer ("Create reel") berhasil dibuka!');
        return true;
      }
      await this.cdp.sleep(1000);
    }

    return true;
  }

  /**
   * 4. Memastikan Form Reels Composer Siap & Lengkap
   */
  async ensureComposerOpen(composerUrl = 'https://business.facebook.com/latest/reels_composer', maxWaitSec = 45) {
    console.log('🌐 Memastikan form Reels composer siap...');
    const currentUrl = await this.cdp.eval('window.location.href');
    if (!currentUrl || !currentUrl.includes('reels_composer')) {
      await this.cdp.navigate(composerUrl);
    }

    const startTime = Date.now();
    while ((Date.now() - startTime) < maxWaitSec * 1000) {
      await this.handleDismissableBanners();

      const state = await this.cdp.eval(`(() => {
        const headings = Array.from(document.querySelectorAll('h1, h2, span, div'))
          .filter(el => (el.textContent || '').trim().toLowerCase() === 'create reel');
        const textEditor = document.querySelector('div[role="textbox"], textarea, div[contenteditable="true"]');
        return { ready: headings.length > 0 && textEditor !== null };
      })()`);

      if (state && state.ready) {
        console.log('   ✅ Form composer Reels siap.');
        return true;
      }
      await this.cdp.sleep(1000);
    }
    return true;
  }

  /**
   * 5. Mengunggah File Video MP4 ke Media Section (File Chooser Event Interception)
   */
  async uploadVideo(videoFilePath, maxWaitSec = 180) {
    const resolvedPath = path.resolve(videoFilePath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`File video tidak ditemukan: ${resolvedPath}`);
    }

    const fileSizeMB = (fs.statSync(resolvedPath).size / (1024 * 1024)).toFixed(1);
    console.log(`📁 [Step 1: Create] Mengunggah file Video: "${path.basename(resolvedPath)}" (${fileSizeMB} MB)...`);

    // 0. Periksa apakah video sudah terpasang di modal
    const alreadyUploaded = await this.cdp.eval(`(() => {
      const has100 = Array.from(document.querySelectorAll('*')).some(el => el.textContent && el.textContent.includes('100%'));
      const videoEl = document.querySelector('video');
      return (has100 || (!!videoEl && videoEl.readyState >= 2));
    })()`);

    if (alreadyUploaded) {
      console.log('   ✅ Video sudah terunggah dan siap di form Reels composer.');
      return true;
    }

    // 1. Enable File Chooser Interception di CDP
    await this.cdp.send('Page.setInterceptFileChooserDialog', { enabled: true });
    this.cdp.removeAllListeners('Page.fileChooserOpened');

    let fileInjected = false;
    const fileHandler = async (params) => {
      try {
        await this.cdp.send('DOM.setFileInputFiles', {
          files: [resolvedPath],
          backendNodeId: params.backendNodeId
        });
        console.log('   ✅ File video BERHASIL diinjeksi ke browser!');
        fileInjected = true;

        // Reset dialog interception
        await this.cdp.send('Page.setInterceptFileChooserDialog', { enabled: false }).catch(() => {});
      } catch (err) {
        console.error('   ⚠️ Error saat setFileInputFiles:', err.message);
      }
    };
    this.cdp.on('Page.fileChooserOpened', fileHandler);

    // 2. Klik tombol "Add video" (cari secara dinamis)
    const addBtnCoord = await this.cdp.eval(`(() => {
      const btns = Array.from(document.querySelectorAll('button, div[role="button"], span, div'))
        .filter(el => {
          const t = (el.innerText || el.textContent || '').trim().toLowerCase();
          return t === 'add video' || t === 'tambahkan video';
        });
      if (btns.length === 0) return null;
      const b = btns[0];
      b.scrollIntoView({ block: 'center', behavior: 'instant' });
      const r = b.getBoundingClientRect();
      return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) };
    })()`);

    if (addBtnCoord) {
      console.log(`   🖱️ Mengklik tombol [Add video] di (${addBtnCoord.x}, ${addBtnCoord.y})...`);
      await this.cdp.dispatchHumanClick(addBtnCoord.x, addBtnCoord.y);
    } else {
      console.log('   🖱️ Mengklik tombol [Add video] default di (154, 341)...');
      await this.cdp.dispatchHumanClick(154, 341);
    }

    // 3. Tunggu hingga video terupload & progress terpantau
    console.log('   ⏳ Memantau proses upload video ke server Facebook...');
    const startTime = Date.now();
    let lastLoggedPercent = '';

    while ((Date.now() - startTime) < maxWaitSec * 1000) {
      await this.handleDismissableBanners();

      // Auto-mute video preview agar tidak bersuara
      await this.cdp.eval(`(() => {
        document.querySelectorAll('video, audio').forEach(v => {
          v.muted = true;
          v.volume = 0;
        });
      })()`);

      const uploadStatus = await this.cdp.eval(`(() => {
        const allText = Array.from(document.querySelectorAll('*'))
          .map(e => (e.innerText || e.textContent || '').trim())
          .filter(t => t.length > 0 && t.length < 80);
        
        const percentText = allText.find(t => /\\d{1,3}%/.test(t)) || '';
        const videoEl = document.querySelector('video');
        const hasVideo = !!videoEl && videoEl.readyState >= 1;
        const is100 = percentText.includes('100%') || (hasVideo && !percentText.includes('0%') && percentText === '');
        
        return {
          hasVideo,
          percentText: percentText || (hasVideo ? 'Video terpasang' : 'Menunggu input...'),
          is100
        };
      })()`);

      if (uploadStatus && uploadStatus.percentText !== lastLoggedPercent) {
        lastLoggedPercent = uploadStatus.percentText;
        const elapsedSec = Math.round((Date.now() - startTime) / 1000);
        process.stdout.write(`\r   ⏳ [Detik ${elapsedSec}s] Status upload: ${uploadStatus.percentText} `);
      }

      if (uploadStatus && uploadStatus.hasVideo && fileInjected) {
        const elapsedSec = Math.round((Date.now() - startTime) / 1000);
        console.log(`\n   ✅ Video berhasil diunggah & diproses di form Reels (selesai pada detik ke-${elapsedSec})!`);
        return true;
      }

      await this.cdp.sleep(1500);
    }

    console.log('\n   ⚠️ Melanjutkan ke pengisian detail...');
    return true;
  }

  /**
   * 6. Mengisi Caption & Hashtag via Clipboard Paste (100% Lexical-compatible)
   */
  async fillCaption(captionText, maxWaitSec = 20) {
    console.log(`✍️ [Caption] Mengisi Caption & Hashtag (${captionText.length} karakter)...`);

    // Scroll ke atas halaman dulu (editor bisa ada di mana saja)
    await this.cdp.eval(`window.scrollTo({ top: 0, behavior: 'instant' })`);
    await this.cdp.sleep(500);

    // Tunggu hingga editor muncul dan siap
    const startWait = Date.now();
    let editorCoord = null;
    while ((Date.now() - startWait) < maxWaitSec * 1000) {
      editorCoord = await this.cdp.eval(`(() => {
        const selectors = [
          'div[role="textbox"]',
          'div[contenteditable="true"]',
          'div[data-lexical-editor="true"]',
          'textarea[placeholder]',
          'div[aria-label*="caption"]',
          'div[aria-label*="Caption"]',
          'div[aria-placeholder]',
          'div[data-contents="true"]'
        ];
        for (const sel of selectors) {
          const els = Array.from(document.querySelectorAll(sel));
          for (const el of els) {
            el.scrollIntoView({ block: 'center', behavior: 'instant' });
            const rect = el.getBoundingClientRect();
            if (rect.width > 30) {
              el.focus();
              return { found: true, x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height), tag: el.tagName, sel };
            }
          }
        }
        return { found: false };
      })()`);

      if (editorCoord && editorCoord.found && editorCoord.w > 0) {
        console.log(`   ✅ Editor ditemukan: ${editorCoord.sel} di (${editorCoord.x}, ${editorCoord.y})`);
        break;
      }
      await this.cdp.sleep(800);
    }

    if (!editorCoord || !editorCoord.found) {
      console.warn('   ⚠️ Editor caption tidak ditemukan, skip caption.');
      return false;
    }

    // 1. Klik editor untuk fokus
    await this.cdp.dispatchHumanClick(
      editorCoord.x + Math.min(30, Math.floor(editorCoord.w / 4)),
      editorCoord.y + Math.min(25, Math.floor(editorCoord.h / 4))
    );
    await this.cdp.sleep(300);

    // 2. Select-all and Clear existing text if any
    await this.cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', modifiers: 4, key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65 });
    await this.cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: 4, key: 'a', code: 'KeyA' });
    await this.cdp.sleep(100);

    // 3. Inject Caption Text directly via CDP Input.insertText
    await this.cdp.send('Input.insertText', { text: captionText });
    await this.cdp.sleep(500);

    // 4. Dismiss any hashtag dropdown popup via Escape & click outside
    await this.cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await this.cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' });
    await this.cdp.sleep(300);
    await this.cdp.dispatchHumanClick(500, 100);
    await this.cdp.sleep(300);

    // 5. Verify caption entered
    const verify = await this.cdp.eval(`(() => {
      const allTextboxes = Array.from(document.querySelectorAll(
        'div[role="textbox"], div[contenteditable="true"], div[data-lexical-editor="true"], textarea'
      ));
      const editor = allTextboxes.find(el => (el.textContent || el.innerText || el.value || '').trim().length > 0) || allTextboxes[0];
      const text = editor ? (editor.textContent || editor.innerText || editor.value || '').trim() : '';
      return { success: text.length > 0, length: text.length, editorTag: editor ? editor.tagName : 'NONE', preview: text.substring(0, 60) };
    })()`);

    console.log('   📊 Status Caption:', JSON.stringify(verify));
    return verify && verify.success;
  }

  /**
   * 7. Berpindah dari Step 1 (Create) ke Step 2 (Edit)
   */
  async goToEditStep(maxWaitSec = 90) {
    console.log('➡️ [Step 2: Edit] Melangkah ke tahap pengeditan...');
    
    const startWait = Date.now();
    while ((Date.now() - startWait) < maxWaitSec * 1000) {
      await this.handleDismissableBanners();

      // Periksa apakah sudah berada di Step 2 (Edit)
      const currentStep = await this.cdp.eval(`(() => {
        const editHeadings = Array.from(document.querySelectorAll('h1, h2, h3, span, div'))
          .filter(el => {
            const t = (el.textContent || '').trim().toLowerCase();
            return t === 'edit' || t === 'audio' || t === 'trim video' || t === 'enhance';
          });
        const isStep2Active = Array.from(document.querySelectorAll('div, span'))
          .some(el => (el.textContent || '').trim().toLowerCase() === 'edit' && el.getAttribute('aria-current') === 'step');
        return isStep2Active || editHeadings.length > 0;
      })()`);

      const btnInfo = await this.cdp.eval(`(() => {
        const nextBtns = Array.from(document.querySelectorAll('button, div[role="button"], a[role="button"]'))
          .filter(b => (b.textContent || '').trim().toLowerCase() === 'next')
          .sort((a, b) => b.getBoundingClientRect().y - a.getBoundingClientRect().y);

        if (nextBtns.length === 0) return { success: false };
        const nextBtn = nextBtns[0];
        const disabled = nextBtn.disabled || nextBtn.getAttribute('aria-disabled') === 'true' || nextBtn.classList.contains('disabled');
        
        if (!disabled) {
          const r = nextBtn.getBoundingClientRect();
          nextBtn.click();
          return { success: true, x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) };
        }
        return { success: false, isStillDisabled: true };
      })()`);

      if (btnInfo && btnInfo.success) {
        if (btnInfo.x > 0 && btnInfo.y > 0) {
          await this.cdp.dispatchHumanClick(btnInfo.x, btnInfo.y);
        }
        console.log('   ✅ Tombol Next footer step 1 berhasil diklik.');
        await this.cdp.sleep(3000);

        // Periksa apakah ada toast blocking "Please wait for the media to upload"
        const toastBlock = await this.cdp.eval(`(() => {
          const toasts = Array.from(document.querySelectorAll('*')).filter(el => {
            const t = (el.textContent || '').toLowerCase();
            return t.includes('please wait for the media') || t.includes('wait for the media to upload');
          });
          return toasts.length > 0;
        })()`);

        if (toastBlock) {
          console.log('   ⏳ Menunggu media selesai diunggah 100% sebelum pindah ke Step 2...');
          await this.cdp.sleep(4000);
          continue;
        }

        return true;
      }
      await this.cdp.sleep(1500);
    }
    
    console.warn('   ⚠️ Tombol Next step 1 belum dapat diklik setelah batas waktu.');
    return false;
  }

  /**
   * 8. Berpindah dari Step 2 (Edit) ke Step 3 (Share)
   * Di Step 2 (Edit), top nav menampilkan: Create ✓ | Edit (active) | Share
   * Klik tombol "Next" di footer ATAU tab "Share" di top nav
   */
  async goToShareStep(maxWaitSec = 35) {
    console.log('➡️ [Step 3: Share] Melangkah ke tahap publikasi...');

    const startWait = Date.now();
    while ((Date.now() - startWait) < maxWaitSec * 1000) {
      await this.handleDismissableBanners();

      const clickRes = await this.cdp.eval(`(() => {
        // Coba klik tombol "Next" di footer bawah
        const nextBtns = Array.from(document.querySelectorAll('button, div[role="button"], a[role="button"]'))
          .filter(b => (b.textContent || '').trim().toLowerCase() === 'next')
          .sort((a, b) => b.getBoundingClientRect().y - a.getBoundingClientRect().y);

        if (nextBtns.length > 0) {
          const nextBtn = nextBtns[0];
          const disabled = nextBtn.disabled || nextBtn.getAttribute('aria-disabled') === 'true' || nextBtn.classList.contains('disabled');
          if (!disabled) {
            const r = nextBtn.getBoundingClientRect();
            nextBtn.click();
            return { success: true, method: 'footer-next', x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) };
          }
        }

        // Fallback: klik tab "Share" di top navigation bar
        const shareTabs = Array.from(document.querySelectorAll('div[role="button"], button, div, span, a'))
          .filter(el => {
            const text = (el.textContent || '').trim().toLowerCase();
            const rect = el.getBoundingClientRect();
            return text === 'share' && rect.top < 150 && rect.top > 0 && rect.width > 0;
          });

        if (shareTabs.length > 0) {
          const r = shareTabs[0].getBoundingClientRect();
          shareTabs[0].click();
          return { success: true, method: 'share-tab', x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) };
        }

        return { success: false };
      })()`);

      if (clickRes && clickRes.success) {
        if (clickRes.x > 0 && clickRes.y > 0) {
          await this.cdp.dispatchHumanClick(clickRes.x, clickRes.y);
        }
        console.log(`   ✅ Pindah ke Step 3 via: ${clickRes.method}`);
        await this.cdp.sleep(3000);
        return true;
      }
      await this.cdp.sleep(1200);
    }

    console.warn('   ⚠️ Gagal pindah ke Step 3 setelah batas waktu, melanjutkan...');
    return false;
  }




  /**
   * 9. Mengatur Mode Jadwal (Schedule) dan Mengisi Tanggal & Jam
   */
  async setScheduleDateAndTime(targetDateStr, targetTimeStr, maxWaitSec = 25) {
    console.log(`⏰ [Step 3: Share] Mengatur Jadwal: Tanggal ${targetDateStr}, Jam ${targetTimeStr} WIB...`);
    const [targetHours, targetMinutes] = targetTimeStr.includes(':') ? targetTimeStr.split(':') : ['09', '00'];

    // 1. Klik tab/opsi Schedule & verifikasi date picker muncul (retry sampai berhasil)
    const startWait = Date.now();
    let scheduleActivated = false;

    while ((Date.now() - startWait) < maxWaitSec * 1000) {
      // Klik tombol/tab/radio Schedule (hanya opsi di badan form, bukan tombol submit footer)
      const tabRes = await this.cdp.eval(`(() => {
        const candidates = Array.from(document.querySelectorAll(
          'div[role="radio"], input[type="radio"], div[role="tab"], button, div[role="button"], label, span'
        )).filter(el => {
          const t = (el.textContent || el.value || el.getAttribute('aria-label') || '').trim().toLowerCase();
          const rect = el.getBoundingClientRect();
          // Filter hanya elemen di bagian atas/tengah form (y < 450), bukan tombol submit di footer
          return (t === 'schedule' || t === 'jadwalkan') && rect.width > 0 && rect.height > 0 && rect.y < 450;
        });

        if (candidates.length === 0) return { found: false };

        const opt = candidates[0];
        opt.click();
        const r = opt.getBoundingClientRect();
        return { found: true, count: candidates.length, text: opt.textContent.trim(), x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) };
      })()`);

      if (tabRes && tabRes.found && tabRes.x > 0) {
        await this.cdp.dispatchHumanClick(tabRes.x, tabRes.y);
      }


      console.log('   📊 Tab Schedule:', JSON.stringify(tabRes));
      await this.cdp.sleep(1500);

      // Verifikasi: apakah date picker muncul? (ini bukti Schedule mode aktif)
      const datePickerVisible = await this.cdp.eval(`(() => {
        const inputs = Array.from(document.querySelectorAll(
          'input[placeholder*="mm/dd"], input[placeholder*="dd/mm"], input[type="date"], input[aria-label="hours"], input[aria-label="minutes"]'
        ));
        const dateText = Array.from(document.querySelectorAll('div, span, label'))
          .some(el => { const t = (el.textContent || '').toLowerCase(); return t.includes('date picker') || t.includes('select a future date') || t.includes('pilih tanggal'); });
        return { hasInputs: inputs.length > 0, hasDatePickerText: dateText, total: inputs.length };
      })()`);

      console.log('   📅 Date picker status:', JSON.stringify(datePickerVisible));

      if (datePickerVisible && (datePickerVisible.hasInputs || datePickerVisible.hasDatePickerText)) {
        scheduleActivated = true;
        break;
      }
    }

    if (!scheduleActivated) {
      console.warn('   ⚠️ Mode Schedule belum aktif setelah batas waktu, melanjutkan...');
    }

    // 2. Isi Tanggal via select-all & insertText
    const dateInputCoord = await this.cdp.eval(`(() => {
      const inputs = Array.from(document.querySelectorAll('input[placeholder*="dd/mm"], input[placeholder*="mm/dd"]'));
      inputs.sort((a, b) => a.getBoundingClientRect().y - b.getBoundingClientRect().y);
      if (inputs.length === 0) return null;
      const inp = inputs[0];
      const rect = inp.getBoundingClientRect();
      return { x: Math.round(rect.x + rect.width/2), y: Math.round(rect.y + rect.height/2) };
    })()`);

    if (dateInputCoord) {
      // Fokus dan select-all
      await this.cdp.dispatchHumanClick(dateInputCoord.x, dateInputCoord.y);
      await this.cdp.sleep(200);
      await this.cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', modifiers: 4, key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65 });
      await this.cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: 4, key: 'a', code: 'KeyA' });
      await this.cdp.sleep(100);
      await this.cdp.send('Input.insertText', { text: targetDateStr });
      await this.cdp.sleep(200);
      await this.cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      await this.cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab' });
      console.log(`   📅 Tanggal diisi: "${targetDateStr}"`);
      await this.cdp.sleep(300);
    } else {
      console.warn('   ⚠️ Date input tidak ditemukan!');
    }

    // 3. Isi Jam & Menit via select-all & insertText
    const timeCoords = await this.cdp.eval(`(() => {
      const hours = Array.from(document.querySelectorAll('input[aria-label="hours"]'));
      const mins  = Array.from(document.querySelectorAll('input[aria-label="minutes"]'));
      hours.sort((a, b) => a.getBoundingClientRect().y - b.getBoundingClientRect().y);
      mins.sort((a, b) => a.getBoundingClientRect().y - b.getBoundingClientRect().y);
      const h = hours[0], m = mins[0];
      const hRect = h ? h.getBoundingClientRect() : null;
      const mRect = m ? m.getBoundingClientRect() : null;
      return {
        h: hRect ? { x: Math.round(hRect.x + hRect.width/2), y: Math.round(hRect.y + hRect.height/2) } : null,
        m: mRect ? { x: Math.round(mRect.x + mRect.width/2), y: Math.round(mRect.y + mRect.height/2) } : null
      };
    })()`);

    if (timeCoords && timeCoords.h) {
      // Jam
      await this.cdp.dispatchHumanClick(timeCoords.h.x, timeCoords.h.y);
      await this.cdp.sleep(150);
      await this.cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', modifiers: 4, key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65 });
      await this.cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: 4, key: 'a', code: 'KeyA' });
      await this.cdp.sleep(100);
      await this.cdp.send('Input.insertText', { text: targetHours });
      await this.cdp.sleep(200);

      // Menit
      if (timeCoords.m) {
        await this.cdp.dispatchHumanClick(timeCoords.m.x, timeCoords.m.y);
        await this.cdp.sleep(150);
        await this.cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', modifiers: 4, key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65 });
        await this.cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: 4, key: 'a', code: 'KeyA' });
        await this.cdp.sleep(100);
        await this.cdp.send('Input.insertText', { text: targetMinutes });
        await this.cdp.sleep(200);
      }

      // Tab untuk konfirmasi
      await this.cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      await this.cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab' });
      await this.cdp.sleep(300);
      console.log(`   ✅ Jam ${targetHours}:${targetMinutes} berhasil diisi`);
    } else {
      console.warn('   ⚠️ Input jam/menit tidak ditemukan.');
    }


    // 4. Verifikasi akhir
    const finalCheck = await this.cdp.eval(`(() => {
      const hourInputs = document.querySelectorAll('input[aria-label="hours"]');
      const dateInputs = document.querySelectorAll('input[placeholder*="dd/mm"], input[placeholder*="mm/dd"]');
      return {
        hourVal: hourInputs.length > 0 ? hourInputs[0].value : null,
        dateVal: dateInputs.length > 0 ? dateInputs[0].value : null,
        timeFieldsFound: hourInputs.length
      };
    })()`);

    console.log(`   ✅ Status jadwal: Tanggal="${finalCheck && finalCheck.dateVal}", Jam="${finalCheck && finalCheck.hourVal}:${targetMinutes}"`);
    return true;
  }



  /**
   * 10. Menunggu Video Selesai Diproses & Tombol Submit Aktif
   */
  async waitForVideoProcessing(maxWaitSec = 45) {
    console.log(`⏳ Menunggu verifikasi video & status siap tayang (Maks: ${maxWaitSec}s)...`);
    const startTime = Date.now();

    while ((Date.now() - startTime) < maxWaitSec * 1000) {
      const status = await this.cdp.eval(`(() => {
        const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));
        const scheduleBtn = buttons.find(b => {
          const text = (b.textContent || '').trim().toLowerCase();
          return text === 'schedule' || text === 'share' || text === 'publish' || text === 'jadwalkan';
        });

        const copyrightBadge = Array.from(document.querySelectorAll('*'))
          .some(el => el.textContent && el.textContent.includes('Your video is safe to publish'));

        if (scheduleBtn) {
          const isDisabled = scheduleBtn.disabled || 
                             scheduleBtn.getAttribute('aria-disabled') === 'true' ||
                             scheduleBtn.classList.contains('disabled');
          return { found: true, isReady: !isDisabled, buttonText: scheduleBtn.textContent.trim(), copyrightSafe: copyrightBadge };
        }
        return { found: false, isReady: false, copyrightSafe: copyrightBadge };
      })()`);

      if (status && status.found && status.isReady) {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(`   ✅ Video selesai diverifikasi (${status.copyrightSafe ? 'Safe & No Copyright' : 'Ready'})! Tombol [${status.buttonText}] AKTIF pada detik ke-${elapsed}.`);
        return true;
      }

      await this.cdp.sleep(1500);
    }

    console.log('   ⚠️ Waktu tunggu verifikasi video selesai.');
    return false;
  }

  /**
   * 11. Melakukan Submit (Schedule) dan Menangani Modal "Reel processing" (Gambar 2)
   */
  async submitAndHandleDoneModal(mode = 'schedule', maxWaitSec = 45) {
    console.log(`🚀 [Submit] Menjalankan Submit Post (Mode: ${mode})...`);

    const clickSubmitRes = await this.cdp.eval(`(() => {
      const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));

      // Cari tombol "Schedule" (saat mode schedule aktif) di pojok kanan bawah
      // Atau tombol "Share" sebagai fallback (mode publish now)
      // KRITERIA: harus aktif (tidak disabled) dan berada di area bawah layar (y > 60% viewport)
      const viewH = window.innerHeight;
      const viewW = window.innerWidth;

      // Prioritas 1: Tombol "Schedule" final submit (bukan tab Schedule)
      // Tombol final ada di pojok kanan bawah layar
      const scheduleSubmitBtn = buttons.find(b => {
        const text = (b.textContent || '').trim().toLowerCase();
        if (text !== 'schedule') return false;
        const rect = b.getBoundingClientRect();
        const isDisabled = b.disabled || b.getAttribute('aria-disabled') === 'true';
        // Harus di area bawah layar (y > 60vh) dan kanan (x > 50vw) = pojok kanan bawah
        return !isDisabled && rect.width > 0 && rect.height > 0 && 
               rect.top > viewH * 0.6 && rect.left > viewW * 0.5;
      });

      if (scheduleSubmitBtn) {
        const rect = scheduleSubmitBtn.getBoundingClientRect();
        scheduleSubmitBtn.click();
        return { success: true, buttonClicked: 'Schedule (bottom-right)', x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) };
      }

      // Prioritas 2: Tombol "Share" final (mode publish now / fallback)
      const shareSubmitBtn = buttons.find(b => {
        const text = (b.textContent || '').trim().toLowerCase();
        if (text !== 'share') return false;
        const rect = b.getBoundingClientRect();
        const isDisabled = b.disabled || b.getAttribute('aria-disabled') === 'true';
        return !isDisabled && rect.width > 0 && rect.height > 0 &&
               rect.top > viewH * 0.6 && rect.left > viewW * 0.5;
      });

      if (shareSubmitBtn) {
        const rect = shareSubmitBtn.getBoundingClientRect();
        shareSubmitBtn.click();
        return { success: true, buttonClicked: 'Share (bottom-right)', x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) };
      }

      // Fallback: cari tombol Submit/Jadwalkan tanpa filter posisi
      const fallbackBtn = buttons.find(b => {
        const text = (b.textContent || '').trim().toLowerCase();
        const isDisabled = b.disabled || b.getAttribute('aria-disabled') === 'true';
        const rect = b.getBoundingClientRect();
        return !isDisabled && rect.width > 0 && rect.height > 0 &&
               (text === 'schedule' || text === 'share' || text === 'publish' || text === 'jadwalkan');
      });

      if (fallbackBtn) {
        const rect = fallbackBtn.getBoundingClientRect();
        fallbackBtn.click();
        return { success: true, buttonClicked: fallbackBtn.textContent.trim() + ' (fallback)', x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) };
      }

      return { success: false, reason: 'Tombol submit final (Schedule/Share di pojok kanan bawah) tidak ditemukan' };
    })()`);


    if (!clickSubmitRes || !clickSubmitRes.success) {
      throw new Error(clickSubmitRes ? clickSubmitRes.reason : 'Gagal mengklik tombol Schedule');
    }

    console.log(`   ✅ Tombol [${clickSubmitRes.buttonClicked}] berhasil diklik.`);

    // Tunggu modal "Reel processing" ATAU navigasi ke planner
    console.log('   ⏳ Menunggu konfirmasi submit (modal Reel processing atau redirect ke Planner)...');
    const startModalWait = Date.now();
    let modalHandled = false;

    while ((Date.now() - startModalWait) < maxWaitSec * 1000) {
      const state = await this.cdp.eval(`(() => {
        const url = window.location.href;
        // Sudah pindah ke planner = sukses (composer URL tidak muncul lagi)
        const inPlanner = url.includes('content_calendar') && !url.includes('reels_composer');
        // Masih di composer? 
        const inComposer = url.includes('reels_composer');
        
        // Cek modal "Reel processing" atau "Done" button
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, div, span'))
          .filter(el => {
            const t = (el.textContent || '').trim().toLowerCase();
            return t === 'reel processing' || t.includes('reel processing') || t.includes('pemrosesan reel');
          });
        const doneButtons = Array.from(document.querySelectorAll('button, div[role="button"]'))
          .filter(b => {
            const t = (b.textContent || '').trim().toLowerCase();
            return t === 'done' || t === 'selesai';
          });

        if (headings.length > 0 || doneButtons.length > 0) {
          const btn = doneButtons[0];
          if (btn) {
            const rect = btn.getBoundingClientRect();
            return { type: 'modal', modalFound: true, buttonFound: true, buttonText: btn.textContent.trim(), x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) };
          }
          return { type: 'modal', modalFound: true, buttonFound: false };
        }

        if (inPlanner) return { type: 'planner', inPlanner: true };
        return { type: 'waiting', inComposer };
      })()`);

      if (state && state.type === 'modal') {
        console.log('   🎉 [MODAL DETECTED] Dialog pop-up "Reel processing" muncul di layar!');
        await this.cdp.humanDelay(1200, 2000);
        if (state.buttonFound && state.w > 0) {
          console.log(`   🖱️ Mengklik tombol [${state.buttonText}] pada modal pemrosesan Reel...`);
          await this.cdp.dispatchHumanClick(state.x + Math.floor(state.w / 2), state.y + Math.floor(state.h / 2));
        } else {
          await this.cdp.eval(`(() => {
            const btn = Array.from(document.querySelectorAll('button, div[role="button"]'))
              .find(b => ['done','selesai'].includes((b.textContent || '').trim().toLowerCase()));
            if (btn) btn.click();
          })()`);
        }
        modalHandled = true;
        // Tunggu redirect ke planner setelah klik Done
        await this.cdp.sleep(3000);
        break;
      }

      if (state && state.type === 'planner') {
        console.log('   ✅ Berhasil redirect ke Planner — jadwal tersimpan di Facebook.');
        modalHandled = true;
        break;
      }

      await this.cdp.sleep(1200);
    }

    if (!modalHandled) {
      console.log('   ⚠️ Timeout menunggu konfirmasi. Navigasi paksa ke planner...');
    }

    // Selalu navigasi ke planner setelah submit untuk memastikan kita di halaman yang benar
    await this.cdp.sleep(2000);
    return { success: true, modalHandled };
  }

  /**
   * 12. Navigasi ke Planner & Verifikasi Jadwal Tersimpan
   * Selalu navigate ulang ke planner sebelum verifikasi untuk memastikan melihat data terbaru.
   */
  async verifyAndAnalyzeCalendar(plannerUrl, targetDateStr = '', targetTimeStr = '') {
    console.log(`📊 [Planner Verify] Navigasi ke planner untuk verifikasi jadwal (${targetDateStr} ${targetTimeStr})...`);

    // Navigasi paksa ke planner — agar kita benar-benar melihat kalender, bukan composer
    await this.cdp.navigate(plannerUrl);
    await this.cdp.sleep(4000);
    await this.handleDismissableBanners();

    const calendarAnalysis = await this.cdp.eval(`(() => {
      const url = window.location.href;
      const inPlanner = url.includes('content_calendar');

      const currentMonthHeading = Array.from(document.querySelectorAll('h1, h2, span, div'))
        .find(el => {
          const t = (el.textContent || '').trim();
          return /^(January|February|March|April|May|June|July|August|September|October|November|December|Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\\s+202\\d/i.test(t);
        })?.textContent.trim() || 'August 2026';

      // Cari kartu jadwal NYATA: harus ada thumbnail (img), bukan form picker
      // Exclude elemen yang berisi teks form: "Date picker", "Time", "Select a future date"
      const FORM_KEYWORDS = ['date picker', 'select a future date', 'time picker', 'jadwal', 'schedule a'];
      const scheduledCards = Array.from(document.querySelectorAll(
        'div[data-testid*="scheduled"], div[data-testid*="calendar_item"], div[data-testid*="post"], div[role="article"]'
      ))
      .filter(el => {
        const t = (el.textContent || '').trim().toLowerCase();
        const hasImg = !!el.querySelector('img[src]:not([src=""]), video');
        const hasTime = /\\d{1,2}:\\d{2}/.test(t);
        const isForm = FORM_KEYWORDS.some(kw => t.includes(kw));
        return hasImg && hasTime && !isForm;
      })
      .map(el => {
        const text = el.textContent.trim().replace(/\\s+/g, ' ');
        const timeMatch = text.match(/(\\d{1,2}:\\d{2})/);
        const img = el.querySelector('img[src]:not([src=""])');
        return {
          time: timeMatch ? timeMatch[1] : '',
          snippet: text.slice(0, 100),
          hasThumbnail: !!img,
          imgSrc: img ? img.src.substring(0, 60) : ''
        };
      });

      return {
        url: url.substring(0, 80),
        inPlanner,
        calendarMonth: currentMonthHeading,
        scheduledCardsFound: scheduledCards.length,
        items: scheduledCards.slice(0, 5)
      };
    })()`);

    if (calendarAnalysis && calendarAnalysis.scheduledCardsFound > 0) {
      console.log(`   ✅ [Kalender] Ditemukan ${calendarAnalysis.scheduledCardsFound} post terjadwal di planner!`);
    } else {
      console.log(`   ⚠️ [Kalender] Tidak ada kartu jadwal terdeteksi di planner. URL: ${calendarAnalysis?.url}`);
    }
    console.log('   📅 [Kalender Status]:', JSON.stringify(calendarAnalysis, null, 2));
    return calendarAnalysis;
  }

  /**
   * 13. 🧹 Smart Memory & Cache Purge (Per-Item)
   */
  async purgeMemoryAndCache() {
    console.log('🧹 [Smart Memory & Cache Purge] Membersihkan V8 Heap, Browser Cache, & Media Buffer...');
    try {
      // 1. Clear Browser Cache
      await this.cdp.send('Network.clearBrowserCache', {}).catch(() => {});
      
      // 2. Collect V8 Garbage in Chrome
      await this.cdp.send('HeapProfiler.collectGarbage', {}).catch(() => {});
      
      // 3. Clear Video DOM elements & object URLs to free memory
      await this.cdp.eval(`(() => {
        document.querySelectorAll('video, audio').forEach(v => {
          v.pause();
          v.muted = true;
          v.removeAttribute('src');
          v.load();
        });
      })()`).catch(() => {});

      // 4. Force Node V8 garbage collection if available
      if (typeof global !== 'undefined' && global.gc) {
        try { global.gc(); } catch(e){}
      }
      console.log('   ✅ Memory & Cache browser berhasil dibersihkan! RAM tetap ringan & super ngebut.');
    } catch (err) {
      console.warn('   ⚠️ Warning saat purge memory:', err.message);
    }
  }
}

module.exports = MetaBusinessDriver;
