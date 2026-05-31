(async () => {
  try {
    console.log('TEST START');
    const { chromium } = require('playwright');
  const publicUrl = 'https://lzcngsbfrkcqupuvqdrk.supabase.co/storage/v1/object/public/choreographer-uploads/b1dc9857-ebfc-42ec-8811-b8b00c6d7d57/draft/1778774505859-reel.mp4';

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Minimal page with a muted video element and JS to attempt playback
  await page.setContent(`
    <video id="v" src="${publicUrl}" muted playsinline preload="metadata" style="width:320px;height:180px"></video>
    <script>
      (async () => {
        const v = document.getElementById('v');
        try {
          const p = await v.play();
          // wait a bit for playback to advance
          await new Promise(r => setTimeout(r, 1500));
          const played = !isNaN(v.currentTime) && v.currentTime > 0;
          console.log(JSON.stringify({ ok: true, played, currentTime: v.currentTime }));
        } catch (err) {
          console.log(JSON.stringify({ ok: false, error: String(err) }));
        }
      })();
    </script>
  `);

  // Capture console from the page
  page.on('console', msg => console.log('PAGE LOG>', msg.text()));

  // wait enough time for the page script to run
  await page.waitForTimeout(4000);

    await browser.close();
    console.log('TEST END');
  } catch (e) {
    console.error('SCRIPT ERROR', e && e.stack ? e.stack : e);
    process.exitCode = 1;
  }
})();
