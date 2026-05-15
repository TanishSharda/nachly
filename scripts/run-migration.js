// Quick helper to execute SQL migration directly
const fetch = global.fetch || require('node-fetch');
const fs = require('fs');
const path = require('path');

(async () => {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(2);
  }

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/018_add_published_at_column.sql');
    if (!fs.existsSync(migrationPath)) {
      console.error('Migration file not found:', migrationPath);
      process.exit(1);
    }

    const sql = fs.readFileSync(migrationPath, 'utf-8');
    console.log('Running SQL migration:\n', sql.substring(0, 200), '...\n');

    // Execute via Supabase RPC or direct REST call
    // We'll use the /functions/v1/sql endpoint if available, or query builder
    // For now, try using the REST API to check if column exists
    const checkUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/information_schema.columns?table_name=eq.choreo_submissions&column_name=eq.published_at`;
    const checkRes = await fetch(checkUrl, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    });
    const existing = await checkRes.json();
    if (existing && existing.length > 0) {
      console.log('Column published_at already exists.');
      process.exit(0);
    }

    // If not exists, we need to run the migration manually in Supabase SQL editor
    console.log('Column published_at does not exist yet.');
    console.log('To apply the migration, copy and paste this SQL in your Supabase SQL Editor:');
    console.log('\n' + sql);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err?.message || err);
    process.exit(1);
  }
})();
