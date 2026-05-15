#!/usr/bin/env node

/**
 * Vercel Environment Variable Setup Helper
 * Configures production environment variables for Nachly deployment
 * 
 * Usage:
 *   node scripts/setup-vercel-env.js
 *   
 * This script will:
 * 1. Check Vercel CLI is installed
 * 2. Prompt for required environment variables
 * 3. Apply them to production deployment
 * 4. Verify they were set correctly
 */

const { execSync } = require("child_process");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

function runCommand(command, description) {
  try {
    console.log(`\n⏳ ${description}...`);
    const output = execSync(command, { encoding: "utf-8" });
    console.log(`✅ ${description}`);
    return output;
  } catch (error) {
    console.error(`❌ Failed: ${description}`);
    console.error(error.message);
    throw error;
  }
}

async function setupVercelEnv() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  Vercel Environment Variable Setup for Nachly Production   ║
╚════════════════════════════════════════════════════════════╝

This script will configure environment variables for production deployment.

Required Variables:
  1. NEXT_PUBLIC_SUPABASE_URL - Your Supabase project URL
  2. NEXT_PUBLIC_SUPABASE_ANON_KEY - Public Supabase key
  3. SUPABASE_SERVICE_ROLE_KEY - Secret Supabase service role key

Optional Variables:
  4. NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET - S3 bucket name (default: choreographer-uploads)

📖 Get these from Supabase Dashboard → Project Settings → API
`);

  try {
    // Check Vercel CLI
    console.log("\n🔍 Checking Vercel CLI...");
    try {
      execSync("vercel --version", { stdio: "ignore" });
      console.log("✅ Vercel CLI installed");
    } catch {
      console.error(
        "❌ Vercel CLI not found. Install with: npm install -g vercel"
      );
      process.exit(1);
    }

    // Authenticate with Vercel
    console.log(
      "\n🔐 Authenticating with Vercel (opens browser if needed)..."
    );
    try {
      execSync("vercel whoami", { stdio: "pipe" });
      console.log("✅ Already authenticated");
    } catch {
      console.log(
        "Opening browser for Vercel authentication. Complete the flow in your browser..."
      );
      execSync("vercel login", { stdio: "inherit" });
    }

    // Collect environment variables
    console.log("\n📝 Enter your environment variables:\n");

    const supabaseUrl =
      (await prompt(
        "NEXT_PUBLIC_SUPABASE_URL (e.g., https://lzcngsbfrkcqupuvqdrk.supabase.co): "
      )) || "https://lzcngsbfrkcqupuvqdrk.supabase.co";

    const anonKey = await prompt("NEXT_PUBLIC_SUPABASE_ANON_KEY: ");
    if (!anonKey) {
      console.error("❌ Anon key is required");
      process.exit(1);
    }

    const serviceRoleKey = await prompt("SUPABASE_SERVICE_ROLE_KEY (⚠️ SECRET): ");
    if (!serviceRoleKey) {
      console.error("❌ Service role key is required");
      process.exit(1);
    }

    const storageBucket =
      (await prompt(
        "NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET [choreographer-uploads]: "
      )) || "choreographer-uploads";

    rl.close();

    // Apply to production
    console.log("\n⚙️  Applying environment variables to production...\n");

    runCommand(
      `vercel env add NEXT_PUBLIC_SUPABASE_URL production "${supabaseUrl}"`,
      "Setting NEXT_PUBLIC_SUPABASE_URL"
    );

    runCommand(
      `vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production "${anonKey}"`,
      "Setting NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );

    runCommand(
      `vercel env add SUPABASE_SERVICE_ROLE_KEY production "${serviceRoleKey}"`,
      "Setting SUPABASE_SERVICE_ROLE_KEY"
    );

    runCommand(
      `vercel env add NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET production "${storageBucket}"`,
      "Setting NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET"
    );

    // Verify
    console.log("\n✅ Verifying variables...\n");
    const envList = runCommand("vercel env list", "Fetching environment variables");
    console.log(envList);

    console.log(`
╔════════════════════════════════════════════════════════════╗
║  ✅ Environment Variables Set Successfully!                ║
╚════════════════════════════════════════════════════════════╝

📦 Next Steps:
  1. Deploy to production: vercel deploy --prod
  2. Apply migrations:    SUPABASE_SERVICE_ROLE_KEY=... npm run migrate:prod
  3. Test on production:  https://nachly.in

🔐 Security Note:
  - Service role key should NEVER be committed to Git
  - Vercel stores secrets encrypted
  - Keys are only available to production environment
`);

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Setup failed:", error.message);
    process.exit(1);
  }
}

setupVercelEnv();
