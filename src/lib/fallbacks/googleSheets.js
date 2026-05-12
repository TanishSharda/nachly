const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

async function appendApplicationToSheet({ serviceAccountJson, spreadsheetId, values }) {
  if (!serviceAccountJson || !spreadsheetId) {
    throw new Error('Missing Google Sheets configuration');
  }

  const credentials = JSON.parse(serviceAccountJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: SCOPES,
  });

  const sheets = google.sheets({ version: 'v4', auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Sheet1!A1',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [values] },
  });
}

module.exports = { appendApplicationToSheet };

async function readApplicationsFromSheet({ serviceAccountJson, spreadsheetId }) {
  if (!serviceAccountJson || !spreadsheetId) {
    throw new Error('Missing Google Sheets configuration');
  }

  const credentials = JSON.parse(serviceAccountJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: SCOPES,
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Sheet1!A2:H',
  });

  const rows = res.data.values || [];
  return rows.map((r) => ({
    userId: r[0] || null,
    name: r[1] || null,
    email: r[2] || null,
    portfolio: r[3] || null,
    sampleVideo: r[4] || null,
    experience: r[5] || null,
    specialties: r[6] ? String(r[6]).split(',') : [],
    createdAt: r[7] || null,
  }));
}

module.exports.readApplicationsFromSheet = readApplicationsFromSheet;
