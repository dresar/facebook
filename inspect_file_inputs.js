const CDPClient = require('./core/cdp');

async function inspectFileInputs() {
  const cdp = new CDPClient();
  await cdp.connect();
  await cdp.enableDomains();

  const fileInputs = await cdp.eval(`(() => {
    const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
    return inputs.map(i => {
      const r = i.getBoundingClientRect();
      return {
        accept: i.accept,
        multiple: i.multiple,
        name: i.name,
        id: i.id,
        filesCount: i.files ? i.files.length : 0,
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
      };
    });
  })()`);

  console.log('File inputs in DOM:', JSON.stringify(fileInputs, null, 2));
  await cdp.close();
}

inspectFileInputs().catch(e => console.error(e));
