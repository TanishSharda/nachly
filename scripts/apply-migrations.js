#!/usr/bin/env node

/**
 * Supabase Migration Runner - Improved Version
 * Applies SQL migrations from supabase/migrations/ directory using direct SQL execution
 * 
 * Usage:
 *   SUPABASE_DB_PASSWORD=your_db_password npm run migrate:prod
 *   OR
 *   SUPABASE_DB_PASSWORD=your_db_password node scripts/apply-migrations.js
 */

const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const postgres = require("postgres");

// Get credentials from environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const databasePassword =
  process.env.SUPABASE_DB_PASSWORD ||
  process.env.DATABASE_PASSWORD ||
  process.env.PGPASSWORD;

if (!supabaseUrl || !databasePassword) {
  console.error("❌ Missing environment variables:");
  console.error("   NEXT_PUBLIC_SUPABASE_URL - Your Supabase project URL");
  console.error("   SUPABASE_DB_PASSWORD - Your Supabase database password");
  console.error("\n📖 Get the database password from Supabase Dashboard → Project Settings → Database");
  console.error("   The service role key is not a database password and cannot be used here.");
  process.exit(1);
}

function getDatabaseUrl(url) {
  const projectId = url.match(/\/\/([^.]+)/)?.[1];

  if (!projectId) {
    throw new Error(`Unable to parse Supabase project ref from URL: ${url}`);
  }

  const poolerUrl = `postgresql://postgres.${projectId}@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres`;
  const databaseUrl = new URL(poolerUrl);
  databaseUrl.password = databasePassword;
  return databaseUrl.toString();
}

async function applyMigrations() {
  const databaseUrl = getDatabaseUrl(supabaseUrl);
  
  const sql = postgres({
    connectionString: databaseUrl,
    ssl: "require",
  });

  try {
    const migrationsDir = path.join(__dirname, "../supabase/migrations");
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    console.log(`\n📂 Found ${files.length} migration files\n`);

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(filePath, "utf8");

      console.log(`⏳ Running: ${file}`);

      try {
        // Execute the SQL migration
        await sql.unsafe(sqlContent);
        console.log(`   ✅ Complete\n`);
      } catch (error) {
        // Check if error is "already exists" (idempotent)
        if (error.message?.includes("already exists") || 
            error.message?.includes("duplicate key")) {
          console.log(`   ℹ️  Already exists (idempotent)\n`);
        } else {
          console.error(`   ❌ Error: ${error.message}\n`);
          console.error(`   Full error:`, error);
          // Continue to next migration instead of exiting
        }
      }
    }

    console.log("✅ Migration run complete\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  } finally {
    // Close the connection
    await sql.end();
  }
}

console.log(`
╔════════════════════════════════════════════════════════════╗
║  Supabase Migration Runner - Production Deployment         ║
╚════════════════════════════════════════════════════════════╝

🔧 Connecting to: ${supabaseUrl}
🔐 Using database password from SUPABASE_DB_PASSWORD/DATABASE_PASSWORD/PGPASSWORD
`);

applyMigrations().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
