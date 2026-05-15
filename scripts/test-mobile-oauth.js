#!/usr/bin/env node

/**
 * Mobile OAuth Testing Guide & Configuration Helper
 * Verifies that all components are set up for deep-link OAuth on mobile
 * 
 * Usage:
 *   node scripts/test-mobile-oauth.js
 */

const fs = require("fs");
const path = require("path");

function checkFile(filePath, description) {
  const fullPath = path.join(__dirname, "..", filePath);
  const exists = fs.existsSync(fullPath);
  console.log(`${exists ? "✅" : "❌"} ${description} (${filePath})`);
  return exists;
}

function checkString(filePath, searchString, description) {
  const fullPath = path.join(__dirname, "..", filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ File not found: ${filePath}`);
    return false;
  }
  const content = fs.readFileSync(fullPath, "utf8");
  const found = content.includes(searchString);
  console.log(
    `${found ? "✅" : "❌"} ${description}${!found ? ` - Missing: "${searchString}"` : ""}`
  );
  return found;
}

function readJsonField(filePath, fieldPath) {
  const fullPath = path.join(__dirname, "..", filePath);
  if (!fs.existsSync(fullPath)) return null;
  const content = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  const keys = fieldPath.split(".");
  let value = content;
  for (const key of keys) {
    value = value[key];
    if (value === undefined) return null;
  }
  return value;
}

console.log(`
╔════════════════════════════════════════════════════════════╗
║  Mobile OAuth Deep-Link Testing & Configuration Checker    ║
╚════════════════════════════════════════════════════════════╝

This script verifies that all necessary components for mobile OAuth
are properly configured and ready for testing.

`);

console.log("📱 CHECKING MOBILE APP CONFIGURATION\n");

const appScheme = readJsonField("mobile/app.json", "expo.scheme");
console.log(`${appScheme === "nachly" ? "✅" : "❌"} Deep-link scheme configured: "${appScheme}"`);

const bundleIdIos = readJsonField("mobile/app.json", "expo.ios.bundleIdentifier");
console.log(
  `${bundleIdIos ? "✅" : "❌"} iOS Bundle ID configured: "${bundleIdIos || "NOT SET"}"`
);

const packageIdAndroid = readJsonField("mobile/app.json", "expo.android.package");
console.log(
  `${packageIdAndroid ? "✅" : "❌"} Android Package ID configured: "${packageIdAndroid || "NOT SET"}"`
);

console.log("\n🔐 CHECKING AUTHENTICATION SERVICE\n");

checkFile(
  "mobile/src/services/auth.ts",
  "Mobile auth service exists"
);

checkString(
  "mobile/src/services/auth.ts",
  "signinWithOAuth",
  "OAuth method implemented"
);

checkString(
  "mobile/src/services/auth.ts",
  "waitForDeepLink",
  "Deep-link listener implemented"
);

checkString(
  "mobile/src/services/auth.ts",
  "exchangeCodeForSession",
  "Session exchange implemented"
);

checkString(
  "mobile/src/services/auth.ts",
  "MOBILE_OAUTH_REDIRECT_URI",
  "Redirect URI configured"
);

checkString(
  "mobile/src/services/auth.ts",
  "expo-secure-store",
  "Secure storage configured"
);

console.log("\n📦 CHECKING DEPENDENCIES\n");

const mobilePackageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../mobile/package.json"), "utf8")
);

const requiredDeps = [
  "@supabase/supabase-js",
  "@supabase/auth-js",
  "expo-secure-store",
  "react-native",
];

for (const dep of requiredDeps) {
  const installed = mobilePackageJson.dependencies?.[dep] || mobilePackageJson.devDependencies?.[dep];
  console.log(
    `${installed ? "✅" : "❌"} ${dep}${installed ? ` (${installed})` : " - NOT INSTALLED"}`
  );
}

console.log("\n🌐 CHECKING SUPABASE CONFIGURATION\n");

const mobileEnvExample = fs.existsSync(path.join(__dirname, "../mobile/.env.example"));
const mobileEnv = fs.existsSync(path.join(__dirname, "../mobile/.env.local"));

console.log(`${mobileEnvExample ? "✅" : "ℹ️ "} .env.example exists: ${mobileEnvExample}`);
console.log(`${mobileEnv ? "✅" : "⚠️ "} .env.local exists: ${mobileEnv}`);

if (mobileEnv) {
  const envContent = fs.readFileSync(path.join(__dirname, "../mobile/.env.local"), "utf8");
  console.log(`${envContent.includes("SUPABASE_URL") ? "✅" : "❌"} EXPO_PUBLIC_SUPABASE_URL set`);
  console.log(`${envContent.includes("SUPABASE_KEY") ? "✅" : "❌"} EXPO_PUBLIC_SUPABASE_ANON_KEY set`);
  console.log(`${envContent.includes("OAUTH_REDIRECT") ? "✅" : "ℹ️ "} EXPO_PUBLIC_OAUTH_REDIRECT_URI set`);
}

console.log(`
════════════════════════════════════════════════════════════════

🚀 NEXT STEPS FOR TESTING MOBILE OAUTH:

1. ✅ SUPABASE OAUTH PROVIDER SETUP
   - Go to: Supabase Dashboard → Authentication → Providers
   - Enable Google provider
   - Add redirect URI: nachly://auth/callback
   - Save credentials

2. ✅ MOBILE ENVIRONMENT VARIABLES
   In mobile/.env.local:
   
   EXPO_PUBLIC_SUPABASE_URL=https://lzcngsbfrkcqupuvqdrk.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<your_anon_key>
   EXPO_PUBLIC_OAUTH_REDIRECT_URI=nachly://auth/callback

3. ✅ DEVELOPMENT BUILD (DEV MACHINE)
   cd mobile
   npm install
   expo start
   
   Then:
   - Press 'i' for iOS simulator, or
   - Press 'a' for Android emulator
   
   In app, tap "Sign in with Google" and verify:
   ✓ Browser opens with Google login
   ✓ User completes OAuth flow
   ✓ Browser redirects to app
   ✓ App receives session token
   ✓ User logged in with name/email displayed

4. ✅ DEVICE TESTING (PHYSICAL)
   Option A: EAS Build (recommended for production-like testing)
   
   eas build --platform ios --profile preview
   eas build --platform android --profile preview
   
   Install on device from EAS dashboard, then test OAuth flow.
   
   Option B: Expo Go (quick testing)
   
   cd mobile && expo start --dev-client
   Open Expo Go app on device, scan QR code
   Test OAuth flow

5. ✅ TROUBLESHOOTING

   Issue: Deep-link not opening app
   → Check app.json "scheme" is "nachly"
   → Verify app is installed/built
   
   Issue: OAuth callback times out
   → Confirm Supabase provider has "nachly://auth/callback"
   → Check device has internet connection
   → Verify auth service timeout is 90s
   
   Issue: "Invalid redirect URI" error
   → Go to Supabase Dashboard
   → Check exact URI match in provider settings
   → Must be exactly: nachly://auth/callback
   
   Issue: Session not saved
   → Verify expo-secure-store is installed
   → Check permissions on device
   → Ensure Supabase keys are correct

════════════════════════════════════════════════════════════════

📝 OAUTH FLOW ARCHITECTURE:

   User App                 Browser                   Supabase
     │                        │                          │
     ├─ signinWithOAuth()      │                          │
     │                         │                          │
     ├─ Linking.openURL()      │                          │
     │                    [Google OAuth]                  │
     │                         │                          │
     │                         │─── code ─────────────────▶
     │                         │                          │
     │                         │◀─ redirect URI ──────────┤
     │                         │                          │
     │◀─ nachly://auth/callback (with code)───────────────┤
     │                         │                          │
     ├─ waitForDeepLink()      │
     │  (listens for deep-link)│
     │                         │
     ├─ exchangeCodeForSession()
     │                         │
     │                         │─── code ──────────────────▶
     │                         │                          │
     │                         │◀─ session ────────────────┤
     │                         │                          │
     ├─ SecureStore.setItem()  │
     │  (save session)         │
     │                         │
     ✓ User logged in!

════════════════════════════════════════════════════════════════
`);

process.exit(0);
