// create_queue.js - Smart Queue Generator for First 5 Videos (001 - 005)
const fs = require('fs');
const path = require('path');

const targetFolder = "C:\\Users\\NCN0C\\Videos\\facebook\\oupot ready";
const captionFile = path.join(targetFolder, "CAPTION_SEMUA_VIDEO.txt");

const rawCaptionText = fs.readFileSync(captionFile, 'utf8');

function getCaptionForIndex(num) {
  const numStr = String(num).padStart(3, '0');
  // Match NO. 00X block
  const blockRegex = new RegExp(`NO\\.\\s*0*${num}[\\s\\S]*?(?=NO\\.\\s*\\d+|$)`, 'i');
  const blockMatch = rawCaptionText.match(blockRegex);
  if (blockMatch) {
    const block = blockMatch[0];
    const capMatch = block.match(/📝\s*CAPTION SIAP SALIN[^\n]*\r?\n([\s\S]*?)(?=\n🔗|\r\n🔗|\n\n|\r\n\r\n|$)/i);
    const linkMatch = block.match(/🔗\s*(https?:\/\/\S+)/i);
    
    let caption = capMatch ? capMatch[1].trim() : `Video ${numStr}`;
    if (linkMatch && linkMatch[1]) {
      caption += `\n\n🔗 ${linkMatch[1].trim()}`;
    }
    return caption;
  }
  return `Video ${numStr}`;
}

const timeSlots = ["09:00", "12:00", "15:00", "18:00", "21:00"];
const targetDateStr = "18/08/2026"; // Besok
const targetIsoDate = "2026-08-18";

const queue = [];

for (let i = 1; i <= 5; i++) {
  const numStr = String(i).padStart(3, '0');
  const filename = `${numStr}.mp4`;
  const filePath = path.join(targetFolder, filename);
  const timeStr = timeSlots[i - 1];
  const caption = getCaptionForIndex(i);

  queue.push({
    index: i,
    filename: filename,
    filePath: filePath,
    targetSchedule: `${targetIsoDate}T${timeStr}`,
    targetDate: targetDateStr,
    targetTime: timeStr,
    cleanTitle: `Video ${numStr}`,
    mainCaption: caption,
    status: "pending",
    retryCount: 0,
    lastAttempt: null,
    error: null
  });
}

const state = {
  productionFolders: [targetFolder],
  totalVideos: 5,
  completedCount: 0,
  failedCount: 0,
  dailyQuota: 5,
  startDate: targetIsoDate,
  timeSlots: timeSlots,
  ctaText: "",
  createdAt: new Date().toISOString(),
  lastUpdated: new Date().toISOString(),
  queue: queue
};

const outPath = path.join(__dirname, 'queue_state.json');
fs.writeFileSync(outPath, JSON.stringify(state, null, 2), 'utf8');

console.log('✅ queue_state.json berhasil dibuat untuk 5 video pertama:');
queue.forEach(q => {
  console.log(`----------------------------------------------------------------`);
  console.log(`[Item ${q.index}] File: ${q.filename} | Jadwal: ${q.targetDate} ${q.targetTime} WIB`);
  console.log(`Caption:\n${q.mainCaption}`);
});
