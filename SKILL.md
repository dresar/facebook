---
name: meta-business-reels-automation
description: "Sistem otomatisasi browser upload video Reels & penjadwalan/publikasi massal Meta Business Suite via Planner Calendar Dropdown (https://business.facebook.com/latest/content_calendar).
- Versi: 2.0.0
- Metode: Chrome DevTools Protocol (CDP) WebSocket murni (Port 9222) + Node.js (100% Pure Synchronous DOM Execution Engine)
- Lokasi Kerja: C:\\Users\\NCN0C\\Videos\\facebook
- Fitur Utama: Planner Calendar Flow (Gambar 1, 2, 3), Trigger Dropdown [▼] -> 'Create reel', Upload video Reels Facebook & Instagram simultan, Auto-Dismiss Modal 'Reel processing' (Tombol Done), Planner Calendar Grid Verification & Analysis, Anti-Bot Bezier Mouse & Typing Engine, Per-Item Smart Memory & Cache Purge, Otomatis Jadwal (5 video/hari), Ekstraksi Caption & Hashtag dari nama file, Pencegahan Duplikat Proses (Mutex Lock), dan Deteksi Logout Otomatis."
---

# 📖 Meta Business Suite Reels Automation Master Guide (v2.0.0)

## 📌 1. Ikhtisar & Arsitektur Sistem
Sistem ini dirancang khusus untuk mengunggah, menjadwalkan, dan memverifikasi video Reels ke **Facebook Page & Instagram** melalui **Meta Business Suite Content Calendar / Planner** secara massal, stabil, dan otomatis dengan proteksi anti-bot tingkat tinggi.

### 🛠️ Keunggulan Utama (v2.0.0):
1. **Planner Calendar Dropdown Entry Flow (Gambar 1 & 3)**:
   - Memulai proses dari kalender pemasaran Planner (`content_calendar`).
   - Melakukan klik natural pada tombol panah dropdown `[▼]` di samping `Create post`, lalu memilih menu `Create reel`.
2. **Auto-Dismiss Modal 'Reel processing' (Gambar 2)**:
   - Setelah tombol `Schedule` diklik, sistem mendeteksi modal popup `Reel processing` ("Once your reel has finished processing, it will be published and you will be notified") dan secara otomatis mengklik tombol `[Done]` warna biru.
3. **Planner Calendar Analysis & Verification (Gambar 1)**:
   - Setelah reel selesai dijadwalkan dan browser kembali ke Planner, sistem menganalisis grid kalender mingguan/bulanan, memverifikasi thumbnail video, jam tayang, serta ikon FB & IG, lalu menyimpan screenshot hasil validasi.
4. **Humanized Anti-Bot Engine**:
   - Pergerakan kursor mouse menggunakan **Cubic Bezier Curve Interpolation** via CDP `Input.dispatchMouseEvent`.
   - Variasi kecepatan pengetikan dan delay aksi manusia (human jitter).
   - Auto-dismiss berbagai banner pengganggu (What's new tour, feedback toasts, cookie consent).
5. **100% Pure Synchronous DOM Engine**:
   - Seluruh evaluasi manipulasi DOM di browser dieksekusi secara sinkron murni (`(() => { ... })()`) dalam waktu `<1ms` tanpa delay microtask browser, menjamin 0% risiko CDP eval timeout.
6. **Per-Item Smart Memory & Cache Purge**:
   - Setiap kali 1 video selesai dijadwalkan, engine langsung memanggil `HeapProfiler.collectGarbage` + `Network.clearBrowserCache` + `Storage.clearDataForOrigin`. RAM laptop tetap ringan (<2.5 GB) dan tidak membengkak saat upload 200 video.
7. **Resilient Mutex Lock & State Recovery**:
   - State tersimpan aman di `config/queue_state.json`. Jika proses terhenti, jalankan kembali dan sistem akan otomatis melanjutkan dari video yang pending.

---

## 🚀 2. Panduan Penggunaan CLI

### 🟢 Mode Produksi Massal (Auto-Submit):
```bash
cd C:\Users\NCN0C\Videos\facebook
node uploader.js --production --submit
```

### 👁️ Mode Pratinjau (Preview Form):
```bash
node uploader.js --production
```

### 🎬 Mode Single Video (Ad-Hoc):
```bash
node uploader.js --file "C:\path\ke\video.mp4" --submit
```

---

## ⚙️ 3. Konfigurasi (`config/config.json`)
```json
{
  "cdp": {
    "host": "127.0.0.1",
    "port": 9222
  },
  "facebook": {
    "planner_url": "https://business.facebook.com/latest/content_calendar/?asset_id=1305449512649082&business_id=622318042872290&nav_ref=internal_nav",
    "composer_url": "https://business.facebook.com/latest/reels_composer?asset_id=1305449512649082&business_id=622318042872290&ir_qe_exposed=1&ref=biz_web_left_nav_create_reel&context_ref=SETTINGS",
    "asset_id": "1305449512649082",
    "business_id": "622318042872290",
    "target_accounts": [
      "KOK ADA?",
      "kok_adasi"
    ]
  },
  "production": {
    "folders": [
      "C:\\Users\\NCN0C\\Music\\editor_berkelas\\ppt\\1\\outputs",
      "C:\\Users\\NCN0C\\Music\\editor_berkelas\\ppt\\2\\outputs"
    ],
    "daily_quota": 5,
    "time_slots": [
      "09:00",
      "12:00",
      "15:00",
      "18:00",
      "21:00"
    ],
    "start_date": "2026-09-01",
    "cta_text": "👉 Cek link di bio untuk download template & info selengkapnya! 🔗✨"
  },
  "automation": {
    "default_mode": "schedule",
    "start_from_planner": true,
    "wait_for_video_upload_sec": 60,
    "wait_for_copyright_check_sec": 45,
    "save_screenshots": true,
    "enable_smart_memory_purge": true,
    "anti_bot": {
      "human_mouse_movement": true,
      "mouse_curve_steps": 12,
      "typing_jitter_min_ms": 30,
      "typing_jitter_max_ms": 80,
      "action_delay_min_ms": 1200,
      "action_delay_max_ms": 2500,
      "cooldown_between_videos_sec": 12,
      "auto_dismiss_banners": true
    }
  }
}
```
