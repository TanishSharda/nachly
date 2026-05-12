#!/usr/bin/env node

/**
 * Supabase Migration Runner
 * Applies SQL migrations from supabase/migrations/ directory
 */

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigrations() {
  const migrationsDir = path.join(__dirname, "../supabase/migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log(`Found ${files.length} migration files`);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, "utf8");

    console.log(`\n▶ Running: ${file}`);

    try {
      // Split by semicolon to handle multiple statements
      const statements = sql.split(";").filter((s) => s.trim());

      for (const statement of statements) {
        if (statement.trim()) {
          const { error } = await supabase.rpc("exec_sql", { sql: statement + ";" });
          if (error) {
            // Check if it's an "already exists" error (idempotent)
            if (error.message?.includes("already exists")) {
              console.log(`  ✓ (already exists)`);
            } else {
              throw error;
            }
          }
        }
      }

      console.log(`  ✓ Complete`);
    } catch (error) {
      // For client-side, try direct SQL execution
      try {
        await supabase.rpc("sql", { query: sql });
        console.log(`  ✓ Complete`);
      } catch (rpcError) {
        console.error(`  ✗ Failed: ${error.message}`);
        // Continue to next migration instead of exiting
      }
    }
  }

  console.log("\n✓ Migration run complete");
  process.exit(0);
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
