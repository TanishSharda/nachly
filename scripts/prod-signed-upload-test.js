(async () => {
  try {
    const path = `automation-test/${Date.now()}.txt`;
    const resp = await fetch('https://nachly.in/api/storage/signed-upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucket: 'choreographer-uploads', path, upsert: true }),
    });
    const json = await resp.json().catch(() => null);
    console.log('Status:', resp.status);
    console.log('Response:', json);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
