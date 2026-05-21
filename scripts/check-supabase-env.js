#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function mask(value) {
  if (!value) return '(missing)';
  if (value.length <= 10) return value;
  return value.slice(0, 6) + '...' + value.slice(-4);
}

function checkEnvVar(name) {
  const val = process.env[name] || '';
  return { name, value: val, present: Boolean(val) };
}

const vars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_OAUTH_REDIRECT_URI'
];

console.log('\nSupabase environment validation\n------------------------------');

let missing = [];
vars.forEach((v) => {
  const { value, present } = checkEnvVar(v);
  console.log(`${v}: ${present ? mask(value) : '(missing)'}`);
  if (!present) missing.push(v);
});

if (missing.length) {
  console.log('\nERROR: Missing required environment variables:\n - ' + missing.join('\n - '));
  console.log('\nNext steps:');
  console.log(' - Ensure you have the correct .env(.local) files for web and mobile.');
  console.log(' - Confirm these values point to the Supabase project where you enabled Google provider.');
  console.log(' - For mobile, `EXPO_PUBLIC_OAUTH_REDIRECT_URI` commonly is `nachly://auth/callback`.');
  process.exitCode = 2;
} else {
  console.log('\nAll required env vars are present.');
  console.log('\nReminder: If you see "Unsupported provider: provider is not enabled", open the Supabase Dashboard → Authentication → Providers and enable Google for the project referenced by the URLs above.');
}

console.log('\nTip: To run this locally:\n  npm run check-supabase-env\n');
