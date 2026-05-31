const url = process.env.SERVICE_ROLE_REMOTE_LOG_URL || 'http://localhost:4000/remote-log';
const token = process.env.SERVICE_ROLE_REMOTE_LOG_TOKEN || '';

(async () => {
  const payload = {
    ts: new Date().toISOString(),
    caller: 'scripts/test-remote-audit',
    note: 'test audit entry',
    env: process.env.NODE_ENV || 'local',
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    console.log('Sent test audit, response:', res.status, text);
  } catch (e) {
    console.error('Failed to send test audit:', e);
    process.exitCode = 2;
  }
})();
