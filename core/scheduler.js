// core/scheduler.js - Smart Production Queue & State Tracking Engine for Facebook Reels
const fs = require('fs');
const path = require('path');

class ProductionScheduler {
  constructor(config = {}, stateFilePath = null) {
    this.config = config;
    this.stateFilePath = stateFilePath || path.join(__dirname, '..', 'config', 'queue_state.json');
    this.state = null;
  }

  extractCaptionForFile(folder, fileName, defaultCta) {
    const baseName = path.basename(fileName, path.extname(fileName));
    const numMatch = baseName.match(/(\d+)/);
    const numStr = numMatch ? numMatch[1].padStart(3, '0') : null;

    const possibleTxtFiles = [
      path.join(folder, 'CAPTION_SEMUA_VIDEO.txt'),
      path.join(folder, '..', 'CAPTION_SEMUA_VIDEO.txt'),
      path.join(folder, '..', '..', 'CAPTION_SEMUA_VIDEO.txt')
    ];

    for (const txtPath of possibleTxtFiles) {
      if (fs.existsSync(txtPath) && numStr) {
        try {
          const raw = fs.readFileSync(txtPath, 'utf8');
          const regex = new RegExp(`NO\\.\\s*0*${parseInt(numStr, 10)}[\\s\\S]*?CAPTION SIAP SALIN[^\\n]*\\r?\\n([\\s\\S]*?)(?=\\n🔗|\\r\\n🔗|\\n\\n|\\r\\n\\r\\n|NO\\.\\s*\\d+|$)`, 'i');
          const linkRegex = new RegExp(`NO\\.\\s*0*${parseInt(numStr, 10)}[\\s\\S]*?🔗\\s*(https?:\\/\\/\\S+)`, 'i');
          const match = raw.match(regex);
          const linkMatch = raw.match(linkRegex);
          if (match && match[1] && match[1].trim().length > 5) {
            let cap = match[1].trim();
            if (linkMatch && linkMatch[1]) {
              cap += `\n\n🔗 ${linkMatch[1].trim()}`;
            }
            return cap;
          }
        } catch (e) {}
      }
    }

    const hashtagsMatch = baseName.match(/(#\S+)/g);
    const hashtags = hashtagsMatch ? hashtagsMatch.join(' ') : '';
    const cleanTitle = baseName.replace(/#\S+/g, '').replace(/\s+/g, ' ').trim();

    return hashtags 
      ? `${cleanTitle}\n\n${defaultCta}\n\n${hashtags}`
      : `${cleanTitle}\n\n${defaultCta}`;
  }

  loadOrCreateQueue(productionFolders, startDateStr = '2026-09-01', timeSlots = ['09:00', '12:00', '15:00', '18:00', '21:00'], ctaText = '👉 Cek link di bio untuk download template & info selengkapnya! 🔗✨') {
    if (fs.existsSync(this.stateFilePath)) {
      try {
        const raw = fs.readFileSync(this.stateFilePath, 'utf8');
        this.state = JSON.parse(raw);
        console.log(`📂 [Scheduler] Memuat state antrean Facebook yang sudah ada (${this.state.completedCount}/${this.state.totalVideos} selesai).`);
        return this.state;
      } catch (err) {
        console.warn('⚠️ Gagal membaca queue_state.json yang ada, membuat ulang...', err.message);
      }
    }

    const folders = Array.isArray(productionFolders) ? productionFolders : [productionFolders];
    let allFiles = [];

    for (const folder of folders) {
      if (!fs.existsSync(folder)) {
        throw new Error(`Folder produksi tidak ditemukan: ${folder}`);
      }
      const filesInFolder = fs.readdirSync(folder)
        .filter(f => f.toLowerCase().endsWith('.mp4'))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
        .map(f => ({ file: f, folder: folder, filePath: path.join(folder, f) }));
      
      allFiles = allFiles.concat(filesInFolder);
    }

    if (allFiles.length === 0) {
      throw new Error(`Tidak ada file .mp4 di folder target.`);
    }

    const queue = [];
    const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
    let currentDate = new Date(startYear, startMonth - 1, startDay);

    const pad = n => String(n).padStart(2, '0');

    for (let i = 0; i < allFiles.length; i++) {
      const item = allFiles[i];
      const slotIndex = i % timeSlots.length;

      if (i > 0 && slotIndex === 0) {
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const year = currentDate.getFullYear();
      const month = pad(currentDate.getMonth() + 1);
      const day = pad(currentDate.getDate());
      const timeStr = timeSlots[slotIndex];
      const targetScheduleIso = `${year}-${month}-${day}T${timeStr}`;

      const baseName = path.basename(item.file, path.extname(item.file));
      const cleanTitle = baseName.replace(/#\S+/g, '').replace(/\s+/g, ' ').trim();
      const mainCaption = this.extractCaptionForFile(item.folder, item.file, ctaText);

      queue.push({
        index: i + 1,
        filename: item.file,
        filePath: item.filePath,
        targetSchedule: targetScheduleIso,
        targetDate: `${day}/${month}/${year}`,
        targetTime: timeStr,
        cleanTitle: cleanTitle,
        mainCaption: mainCaption,
        status: 'pending',
        retryCount: 0,
        lastAttempt: null,
        error: null
      });
    }

    this.state = {
      productionFolders: folders,
      totalVideos: allFiles.length,
      completedCount: 0,
      failedCount: 0,
      dailyQuota: timeSlots.length,
      startDate: startDateStr,
      timeSlots: timeSlots,
      ctaText: ctaText,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      queue: queue
    };

    this.saveState();
    console.log(`✨ [Scheduler] Berhasil membuat antrean Facebook baru: ${allFiles.length} video (${timeSlots.length} video/hari selama ${Math.ceil(allFiles.length / timeSlots.length)} hari).`);
    return this.state;
  }

  saveState() {
    if (!this.state) return;
    this.state.lastUpdated = new Date().toISOString();
    const dir = path.dirname(this.stateFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.stateFilePath, JSON.stringify(this.state, null, 2), 'utf8');
  }

  getNextPendingItem() {
    if (!this.state || !this.state.queue) return null;
    return this.state.queue.find(item => item.status === 'pending' || (item.status === 'failed' && item.retryCount < 3));
  }

  markCompleted(index, submitResult = {}) {
    if (!this.state || !this.state.queue) return;
    const item = this.state.queue.find(it => it.index === index);
    if (item) {
      item.status = 'scheduled';
      item.lastAttempt = new Date().toISOString();
      item.submitResult = submitResult;
      item.error = null;
      this.state.completedCount = this.state.queue.filter(it => it.status === 'scheduled').length;
      this.state.failedCount = this.state.queue.filter(it => it.status === 'failed').length;
      this.saveState();
    }
  }

  markFailed(index, errorMessage) {
    if (!this.state || !this.state.queue) return;
    const item = this.state.queue.find(it => it.index === index);
    if (item) {
      item.status = 'failed';
      item.retryCount = (item.retryCount || 0) + 1;
      item.lastAttempt = new Date().toISOString();
      item.error = errorMessage;
      this.state.completedCount = this.state.queue.filter(it => it.status === 'scheduled').length;
      this.state.failedCount = this.state.queue.filter(it => it.status === 'failed').length;
      this.saveState();
    }
  }

  getStats() {
    if (!this.state || !this.state.queue) return { total: 0, completed: 0, failed: 0, pending: 0, percent: '0.0%' };
    const total = this.state.totalVideos;
    const completed = this.state.queue.filter(it => it.status === 'scheduled').length;
    const failed = this.state.queue.filter(it => it.status === 'failed' && it.retryCount >= 3).length;
    const pending = total - completed - failed;
    const percent = total > 0 ? ((completed / total) * 100).toFixed(1) + '%' : '0.0%';

    return { total, completed, failed, pending, percent };
  }
}

module.exports = ProductionScheduler;
