(async () => {
  try {
    console.log('LOCAL TEST START');
    const { chromium } = require('playwright');
    const url = process.argv[2] || process.env.TEST_URL || 'http://localhost:3000/test-public-playback?src=/bijuria.mp4';

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('console', msg => console.log('PAGE LOG>', msg.text()));

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // wait for a video element if present (allow client hydration)
    let video = null;
    try {
      await page.waitForSelector('video', { timeout: 15000 });
      video = await page.$('video');
    } catch (err) {
      // fallback: check iframe or source tags
      const iframeCount = await page.$$eval('iframe', iframes => iframes.length);
      const sources = await page.$$eval('source', s => s.map(x => x.src || x.getAttribute('src')));
      console.error('No direct video element found. iframeCount:', iframeCount, 'sources:', sources);
      process.exitCode = 2;
      await browser.close();
      return;
    }

    // try to play the video from the page context
    const result = await page.evaluate(async () => {
      const v = document.querySelector('video');
      if (!v) return { ok: false, error: 'no-video' };
      v.muted = true;
      v.playsInline = true;
      try {
        await v.play();
        await new Promise(r => setTimeout(r, 1500));
        return { ok: true, currentTime: v.currentTime };
      } catch (err) {
        return { ok: false, error: String(err) };
      }
    });

    console.log('RESULT', JSON.stringify(result));

    await browser.close();
    console.log('LOCAL TEST END');
  } catch (e) {
    console.error('SCRIPT ERROR', e && e.stack ? e.stack : e);
    process.exitCode = 1;
  }
})();
