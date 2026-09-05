// core/cdp.js - Chrome DevTools Protocol Client with Humanized Anti-Bot Engine
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');

class CDPClient {
  constructor(options = {}) {
    this.host = options.host || '127.0.0.1';
    this.port = options.port || 9222;
    this.wsUrl = options.wsUrl || null;
    this.ws = null;
    this.id = 0;
    this.callbacks = new Map();
    this.currentMousePos = { x: 400, y: 300 };
  }

  static async getActivePages(host = '127.0.0.1', port = 9222, maxAttempts = 5) {
    let lastError = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const list = await new Promise((resolve, reject) => {
          const req = http.get(`http://${host}:${port}/json/list`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              try {
                resolve(JSON.parse(data));
              } catch (e) {
                reject(new Error(`Gagal parse JSON dari Chrome CDP: ${e.message}`));
              }
            });
          });
          req.on('error', (err) => reject(err));
          req.setTimeout(3000, () => {
            req.destroy();
            reject(new Error('Timeout menghubungi Chrome CDP'));
          });
        });
        return list;
      } catch (err) {
        lastError = err;
        if (attempt < maxAttempts) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }
    throw new Error(`Tidak dapat terhubung ke Chrome Remote Debugging di ${host}:${port}. Pastikan Chrome sudah aktif. Detail: ${lastError ? lastError.message : 'Unknown'}`);
  }

  static async findTargetTab(host = '127.0.0.1', port = 9222, urlFilter = 'facebook.com') {
    const list = await CDPClient.getActivePages(host, port);
    let page = list.find(p => p.type === 'page' && p.url && p.url.includes(urlFilter)) ||
               list.find(p => p.type === 'page');
    if (!page) {
      // Auto-create new tab via PUT /json/new
      const targetUrl = 'https://business.facebook.com/latest/content_calendar?business_id=622318042872290&asset_id=1305449512649082';
      page = await new Promise((resolve) => {
        const req = http.request({
          hostname: host,
          port: port,
          path: '/json/new?' + encodeURIComponent(targetUrl),
          method: 'PUT'
        }, (res) => {
          let d = '';
          res.on('data', c => d += c);
          res.on('end', () => {
            try { resolve(JSON.parse(d)); } catch (e) { resolve(null); }
          });
        });
        req.on('error', () => resolve(null));
        req.end();
      });
    }
    return page;
  }

  async connect(targetWsUrl = null) {
    const wsUrl = targetWsUrl || this.wsUrl;
    if (!wsUrl) {
      const target = await CDPClient.findTargetTab(this.host, this.port, 'business.facebook.com');
      if (!target || !target.webSocketDebuggerUrl) {
        throw new Error('Tidak ditemukan tab Meta Business Suite aktif di Chrome Remote Debugging.');
      }
      this.wsUrl = target.webSocketDebuggerUrl;
      console.log(`🔌 Terhubung ke Tab Chrome: "${target.title || 'Meta Business Suite'}"`);
    } else {
      this.wsUrl = wsUrl;
    }

    return new Promise((resolve, reject) => {
      const connectTimeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout to ' + this.wsUrl));
      }, 5000);

      this.ws = new WebSocket(this.wsUrl);
      this.ws.on('open', () => {
        clearTimeout(connectTimeout);
        resolve(this);
      });
      this.ws.on('error', (err) => {
        clearTimeout(connectTimeout);
        reject(err);
      });
      if (!this.eventListeners) this.eventListeners = new Map();

      this.ws.on('message', (data) => {
        try {
          const raw = typeof data === 'string' ? data : data.toString('utf8');
          const msg = JSON.parse(raw);
          if (msg.method === 'Page.javascriptDialogOpening') {
            this.send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
          }

          if (msg.id && this.callbacks.has(msg.id)) {
            const cb = this.callbacks.get(msg.id);
            this.callbacks.delete(msg.id);
            if (msg.error) {
              cb.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
            } else {
              cb.resolve(msg.result);
            }
          } else if (msg.method && this.eventListeners.has(msg.method)) {
            const handlers = this.eventListeners.get(msg.method);
            for (const handler of handlers) {
              try { handler(msg.params); } catch (err) {}
            }
          }
        } catch (e) {}
      });
    });
  }

  on(method, callback) {
    if (!this.eventListeners) this.eventListeners = new Map();
    if (!this.eventListeners.has(method)) {
      this.eventListeners.set(method, []);
    }
    this.eventListeners.get(method).push(callback);
  }

  off(method, callback) {
    if (!this.eventListeners || !this.eventListeners.has(method)) return;
    const handlers = this.eventListeners.get(method);
    const idx = handlers.indexOf(callback);
    if (idx !== -1) handlers.splice(idx, 1);
  }

  removeAllListeners(method) {
    if (this.eventListeners && this.eventListeners.has(method)) {
      this.eventListeners.delete(method);
    }
  }


  async reconnect() {
    try {
      if (this.ws) {
        try { this.ws.close(); } catch(e){}
      }
      this.callbacks.clear();
      this.wsUrl = null;
      await this.connect();
      await this.enableDomains();
      console.log('🔄 [CDP Client] Berhasil re-koneksi otomatis ke tab Chrome!');
      return true;
    } catch (e) {
      console.warn('⚠️ Re-koneksi CDP gagal:', e.message);
      return false;
    }
  }

  async send(method, params = {}, timeoutMs = 25000) {
    if (!this.ws || this.ws.readyState !== 1) {
      console.log('⚠️ WebSocket terputus, melakukan reconnect...');
      const ok = await this.reconnect();
      if (!ok || !this.ws || this.ws.readyState !== 1) {
        throw new Error(`Gagal mengirim [${method}]: WebSocket tidak aktif.`);
      }
    }

    const id = ++this.id;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.callbacks.has(id)) {
          this.callbacks.delete(id);
          const errMsg = `Timeout CDP [${method}] setelah ${timeoutMs}ms`;
          reject(new Error(errMsg));
        }
      }, timeoutMs);

      this.callbacks.set(id, {
        resolve: (val) => { clearTimeout(timer); resolve(val); },
        reject: (err) => { clearTimeout(timer); reject(err); }
      });

      try {
        this.ws.send(JSON.stringify({ id, method, params }));
      } catch (err) {
        clearTimeout(timer);
        this.callbacks.delete(id);
        reject(err);
      }
    });
  }

  async enableDomains() {
    try {
      await this.send('Runtime.enable', {}, 3000).catch(() => {});
      await this.send('DOM.enable', {}, 3000).catch(() => {});
      await this.send('Page.enable', {}, 3000).catch(() => {});
      await this.send('Input.setIgnoreInputEvents', { ignore: false }, 3000).catch(() => {});
    } catch (e) {}
  }

  async eval(expression, timeoutMs = 15000) {
    try {
      const res = await this.send('Runtime.evaluate', {
        expression: expression,
        returnByValue: true,
        awaitPromise: false
      }, timeoutMs);
      return res && res.result ? res.result.value : null;
    } catch (e) {
      console.warn('eval error:', e.message);
      return null;
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async humanDelay(minMs = 1000, maxMs = 2500) {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  async navigate(url) {
    try {
      await this.send('Page.navigate', { url }, 10000);
    } catch (e) {
      try {
        await this.send('Runtime.evaluate', { expression: `window.location.href = ${JSON.stringify(url)}` }, 5000);
      } catch (err) {}
    }
    await this.sleep(3000);
    await this.enableDomains();
  }

  // -------------------------------------------------------------
  // 🖱️ HUMANIZED MOUSE & KEYBOARD ENGINE (ANTI-BOT)
  // -------------------------------------------------------------

  async dispatchHumanMouseMove(targetX, targetY) {
    this.currentMousePos = { x: targetX, y: targetY };
    await this.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: Math.max(0, targetX),
      y: Math.max(0, targetY)
    }).catch(() => {});
  }

  /**
   * Simulasi klik mouse realistis (Move -> Press -> Release)
   */
  async dispatchHumanClick(targetX, targetY) {
    // 1. Move to element
    await this.dispatchHumanMouseMove(targetX, targetY);
    await this.sleep(50);

    // 2. Mouse Down
    await this.send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: targetX,
      y: targetY,
      button: 'left',
      buttons: 1,
      clickCount: 1
    });

    // 3. Click Duration
    await this.sleep(80);

    // 4. Mouse Up
    await this.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: targetX,
      y: targetY,
      button: 'left',
      buttons: 0,
      clickCount: 1
    });

    await this.sleep(100);
    return true;
  }

  /**
   * Simulasi pengetikan teks karakter-demi-karakter dengan variasi kecepatan natural
   */
  async dispatchHumanType(text, minJitterMs = 30, maxJitterMs = 80) {
    for (const char of text) {
      if (char === '\n') {
        await this.send('Input.dispatchKeyEvent', {
          type: 'keyDown',
          windowsVirtualKeyCode: 13,
          nativeVirtualKeyCode: 13,
          key: 'Enter',
          code: 'Enter',
          text: '\r'
        });
        await this.send('Input.dispatchKeyEvent', {
          type: 'keyUp',
          windowsVirtualKeyCode: 13,
          nativeVirtualKeyCode: 13,
          key: 'Enter',
          code: 'Enter'
        });
      } else {
        await this.send('Input.dispatchKeyEvent', {
          type: 'keyDown',
          text: char,
          unmodifiedText: char,
          key: char
        });
        await this.send('Input.dispatchKeyEvent', {
          type: 'keyUp',
          text: char,
          unmodifiedText: char,
          key: char
        });
      }

      const delay = Math.floor(Math.random() * (maxJitterMs - minJitterMs + 1)) + minJitterMs;
      await this.sleep(delay);
    }
  }

  // -------------------------------------------------------------
  // 🧹 MEMORY PURGE & SYSTEM MAINTENANCE
  // -------------------------------------------------------------

  async clearMemoryAndCache() {
    try {
      await Promise.allSettled([
        this.send('HeapProfiler.collectGarbage', {}, 5000),
        this.send('Network.clearBrowserCache', {}, 5000),
        this.send('Storage.clearDataForOrigin', {
          origin: 'https://business.facebook.com',
          storageTypes: 'cache_storage'
        }, 5000)
      ]);
    } catch (e) {}
  }

  async captureScreenshot(name = 'screenshot', outputDir = null) {
    try {
      const res = await this.send('Page.captureScreenshot', { format: 'png' });
      if (res && res.data) {
        const outPath = outputDir ? path.join(outputDir, `${name}.png`) : path.join(process.cwd(), `${name}.png`);
        fs.writeFileSync(outPath, Buffer.from(res.data, 'base64'));
        return outPath;
      }
    } catch (e) {
      console.warn('Gagal ambil screenshot:', e.message);
    }
    return null;
  }

  async close() {
    if (this.ws) {
      try { this.ws.close(); } catch(e){}
    }
    this.callbacks.clear();
  }
}

module.exports = CDPClient;
