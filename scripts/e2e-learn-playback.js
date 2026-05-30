(async () => {
  const { chromium } = require('playwright');
  const base = 'https://nachly.in';
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    console.log('NAVIGATE to learn feed');
    await page.goto(base + '/learn/feed', { waitUntil: 'networkidle' , timeout: 30000});
    // find a choreo link card (exclude the feed root)
    await page.waitForTimeout(1000);
    const hrefs = await page.$$eval('a[href]', els => els.map(e => e.getAttribute('href')));
    let choreoHref = hrefs.find(h => h && h.includes('/learn/') && !h.endsWith('/learn/feed') && h !== '/learn/feed');
    const candidateIds = [
      '20e922b2-550e-498a-945e-44f49afc41f0',
      '501c44bd-f8c3-441d-b38b-ef2a125b6b41'
    ];
    if (!choreoHref) {
      for (const id of candidateIds) {
        const tryUrl = `${base}/learn/${id}`;
        const resp = await page.goto(tryUrl, { waitUntil: 'domcontentloaded' });
        if (resp && resp.status && resp.status !== 404) {
          choreoHref = `/learn/${id}`;
          console.log('Found choreo via id:', choreoHref);
          break;
        }
      }
    }
    if (!choreoHref) {
      throw new Error('No choreo link found on feed page or candidate ids');
    }
    await page.goto(new URL(choreoHref, base).toString(), { waitUntil: 'networkidle' });
    await page.waitForLoadState('networkidle');
    // wait for video element or iframe
    const video = page.locator('video');
    const iframe = page.locator('iframe');
    try {
      await video.waitFor({ state: 'attached', timeout: 30000 });
      console.log('Video element found, attempting to play...');
    } catch (e) {
      console.log('No direct video element; checking for iframe or sources');
      const iframeCount = await iframe.count();
      console.log('iframe count:', iframeCount);
      if (iframeCount === 0) {
        // try looking for source tags
        const sources = await page.$$eval('source', s => s.map(x => x.src || x.getAttribute('src')));
        console.log('source tags:', sources);
        if (!sources || sources.length === 0) {
          throw new Error('No video, iframe, or source tags found on choreo page');
        }
      }
    }
    const result = await page.evaluate(async () => {
      const v = document.querySelector('video');
      if (!v) return { ok: false, error: 'no video element' };
      try {
        v.muted = true;
        const p = await v.play();
        await new Promise(r => setTimeout(r, 2000));
        return { ok: true, currentTime: v.currentTime };
      } catch (err) {
        return { ok: false, error: String(err) };
      }
    });

    console.log('Playback result:', JSON.stringify(result));
  } catch (e) {
    console.error('E2E SCRIPT ERROR', e.stack || e);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
