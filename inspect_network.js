const CDPClient = require('./core/cdp');

async function inspectNetworkAndErrors() {
  const cdp = new CDPClient();
  await cdp.connect();
  await cdp.enableDomains();

  const info = await cdp.eval(`(() => {
    // Check if there are any error messages visible on page
    const errors = Array.from(document.querySelectorAll('*'))
      .map(e => (e.innerText || '').trim())
      .filter(t => t.toLowerCase().includes('error') || t.toLowerCase().includes('failed') || t.toLowerCase().includes('try again'));

    // Check performance resource timings for rupload or video uploads
    const entries = performance.getEntriesByType('resource')
      .filter(r => r.name.includes('upload') || r.name.includes('video') || r.name.includes('graphql') || r.name.includes('rupload'))
      .slice(-10)
      .map(r => ({
        name: r.name.substring(0, 80),
        duration: Math.round(r.duration),
        transferSize: r.transferSize,
        encodedBodySize: r.encodedBodySize
      }));

    return {
      errors: Array.from(new Set(errors)),
      recentUploadRequests: entries
    };
  })()`);

  console.log('Inspection result:', JSON.stringify(info, null, 2));
  await cdp.close();
}

inspectNetworkAndErrors().catch(e => console.error(e));
