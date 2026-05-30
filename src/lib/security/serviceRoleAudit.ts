import fs from 'fs';
import path from 'path';

const LOG_PATH = path.resolve(process.cwd(), 'service-role-audit.log');

export async function logServiceRoleUsage(details?: { caller?: string; note?: string }) {
  const entry = {
    ts: new Date().toISOString(),
    caller: details?.caller || 'unknown',
    note: details?.note || '',
    env: process.env.NODE_ENV || 'unknown',
  };

  try {
    console.info('[SERVICE-ROLE]', entry.ts, entry.caller, entry.note);
  } catch (e) {
    // ignore
  }

  try {
    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(LOG_PATH, line, { encoding: 'utf8' });
  } catch (e) {
    // writing logs may fail in some environments; ignore
  }

  // Optional remote logging: if SERVICE_ROLE_REMOTE_LOG_URL is set, POST JSON there.
  try {
    const url = process.env.SERVICE_ROLE_REMOTE_LOG_URL?.trim();
    if (url) {
      const token = process.env.SERVICE_ROLE_REMOTE_LOG_TOKEN?.trim();
      // Use global fetch (Node 18+) to send a copy off-host
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(entry),
      }).catch(() => {
        // don't crash if remote logging fails
      });
    }
  } catch (e) {
    // ignore remote logging failures
  }
}

export default logServiceRoleUsage;
