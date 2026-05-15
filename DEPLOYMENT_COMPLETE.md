# Production Deployment Guide - Nachly

## Quick Start

This guide covers the three essential tasks for deploying Nachly to production:

1. **Apply Supabase Migrations** - Database schema setup
2. **Configure Production Environment** - Vercel deployment variables
3. **Test Mobile OAuth** - Deep-link authentication on mobile devices

---

## Task 1: Apply Supabase Migrations ✅

All database migrations are ready in `supabase/migrations/` (001-018 and beyond).

### Quick Command

```bash
# Get your Supabase service role key from:
# Dashboard → Settings → API → service_role
# Get your Supabase database password from:
# Dashboard → Settings → Database

NEXT_PUBLIC_SUPABASE_URL=https://lzcngsbfrkcqupuvqdrk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
SUPABASE_DB_PASSWORD=<your_database_password>

npm run migrate:prod
```

### Available Scripts

| Command | Purpose |
|---------|---------|
| `npm run migrate:local` | Apply migrations to local Supabase |
| `npm run migrate:prod` | Apply migrations to production |

### Manual Application (via SQL Editor)

If CLI doesn't work, apply migrations manually:

1. Supabase Dashboard → SQL Editor
2. Create new query
3. Copy each migration file (001 → 018) and run
4. Check for "already exists" (expected for idempotent migrations)

### What Gets Created

The migrations set up:

- `profiles` - User account profiles with roles
- `routines` - Published choreography routines
- `choreo_submissions` - User submissions with AI scoring
- `routine_videos` - Performance video storage references
- `practice_sessions` - User practice attempt tracking
- `leaderboard` - Engagement rankings
- `creator_wizard_presets` - Creator workflow state
- And 10+ more supporting tables with indexes and RLS policies

### Troubleshooting Migrations

| Error | Solution |
|-------|----------|
| "already exists" | Idempotent migration; safe to ignore |
| Permission denied | Use service role key, not anon key |
| Connection timeout | Verify SUPABASE_URL and key are correct |

---

## Task 2: Configure Production Environment ✅

Set up Vercel with required secrets and deployment variables.

### Quick Command

```bash
# Interactive setup with browser authentication
node scripts/setup-vercel-env.js

# Or manually add each variable:
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET production
```

### Required Variables for Vercel

| Variable | Type | Value | Source |
|----------|------|-------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | `https://lzcngsbfrkcqupuvqdrk.supabase.co` | Supabase Dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Anonymous key | Supabase API Settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Service role key | ⚠️ Keep secret! |
| `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` | Public | `choreographer-uploads` | Optional, for storage |

### Getting API Keys from Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to Settings → API
4. Copy the keys you need
5. ⚠️ **NEVER commit service_role key to Git!**

### Deployment Checklist

```bash
# 1. Verify variables are set
vercel env list

# 2. Deploy to production
vercel deploy --prod

# 3. Check deployment logs
vercel logs https://nachly.in --prod

# 4. Verify on live site
# https://nachly.in/scroll - should show feed
# https://nachly.in/learn - should show tutorials
```

### Vercel CLI Reference

```bash
# Login to Vercel
vercel login

# Add environment variable
vercel env add MY_VAR production

# List all environment variables
vercel env list

# Remove environment variable
vercel env remove MY_VAR production

# Pull environment variables to local
vercel env pull

# Deploy without pushing to production
vercel deploy

# Deploy to production
vercel deploy --prod

# Check deployment status
vercel status

# View logs
vercel logs <domain> --prod
```

---

## Task 3: Test Mobile OAuth Deep-Link ✅

Mobile OAuth uses deep-linking to handle callbacks from Google OAuth.

### Pre-Flight Check

Run the verification script:

```bash
node scripts/test-mobile-oauth.js
```

This checks:
- ✅ App scheme configured to "nachly"
- ✅ Bundle IDs set (iOS: com.nachly.app, Android: com.nachly.app)
- ✅ Authentication service with OAuth methods
- ✅ Dependencies installed (supabase-js, expo-secure-store)
- ✅ Environment variables

### Step 1: Configure Supabase OAuth Provider

1. **Supabase Dashboard** → Authentication → Providers
2. **Google** → Enable provider
3. **Redirect URIs** → Add: `nachly://auth/callback`
4. **Save** OAuth credentials (Client ID, Secret)

### Step 2: Set Mobile Environment Variables

Create `mobile/.env.local`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://lzcngsbfrkcqupuvqdrk.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your_anon_key_from_supabase>
EXPO_PUBLIC_OAUTH_REDIRECT_URI=nachly://auth/callback
```

### Step 3: Test on Local Development

#### Option A: Expo Go (Quickest)

```bash
cd mobile
npm install  # First time only

expo start --dev-client

# Scan QR code with Expo Go app on phone
# In app: tap "Sign in with Google"
# Verify:
#   ✓ Browser opens with Google login
#   ✓ After approval, redirects back to app
#   ✓ Session saved successfully
#   ✓ User name/email displayed
```

#### Option B: iOS Simulator

```bash
cd mobile
npm install

expo start

# Press 'i' for iOS simulator
# Follow same test flow as Expo Go
```

#### Option B: Android Emulator

```bash
cd mobile
npm install

expo start

# Press 'a' for Android emulator
# Follow same test flow
```

### Step 4: Test on Physical Device

#### Option A: EAS Build (Recommended for Production-Like Testing)

```bash
cd mobile

# Configure eas.json with your Expo account
# Follow prompts to create build

eas build --platform ios --profile preview
eas build --platform android --profile preview

# Install on device from EAS dashboard
# Test OAuth flow with physical device
```

#### Option B: EAS Update (Live Updates)

```bash
cd mobile
eas update --branch production

# Instantly push updates to production builds
# without rebuilding the entire app
```

### OAuth Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Mobile OAuth Flow                         │
└─────────────────────────────────────────────────────────────┘

  Nachly App                 Browser               Supabase
      │                         │                    │
      ├─ signinWithOAuth()      │                    │
      │                         │                    │
      ├─ Linking.openURL()      │                    │
      │  (auth URL)        Google OAuth              │
      │                         │                    │
      │                         ├─ auth code ───────▶│
      │                         │                    │
      │                         │◀─ auth callback ───┤
      │                         │    (nachly://...)  │
      │                         │                    │
      ├─ waitForDeepLink()      │
      │ (catches deep-link)     │
      │                         │
      ├─ exchangeCodeForSession()
      │                         │
      │                         ├─ exchange code ───▶│
      │                         │                    │
      │                         │◀─ session token ───┤
      │                         │                    │
      ├─ SecureStore.save()     │
      │ (persist session)       │
      │                         │
      ✓ Logged in!
```

### Troubleshooting Mobile OAuth

| Problem | Solution |
|---------|----------|
| "App not recognized" | Check `scheme: "nachly"` in app.json |
| Deep-link timeout | Verify Supabase OAuth has `nachly://auth/callback` |
| "Invalid redirect URI" | Double-check exact URI in Supabase provider |
| Browser doesn't redirect | Ensure app is installed/built on device |
| Session not saved | Verify `expo-secure-store` installed |
| "Browser unavailable" | Install browser app on device/simulator |
| Network error | Check device internet connection |

---

## Complete Deployment Workflow

### Order of Operations

```
1. Apply Migrations
   └─ Creates database schema
   └─ Enables all features (submissions, leaderboard, etc.)

2. Configure Production Environment
   └─ Set Supabase keys in Vercel
   └─ Set storage bucket name
   └─ Deploy code to production

3. Test Mobile OAuth
   └─ Configure Supabase provider
   └─ Set mobile environment variables
   └─ Test on dev machine (simulator)
   └─ Build and test on physical device
```

### Verification After Deployment

```bash
# 1. Web app is live
curl https://nachly.in

# 2. Database queries work
curl https://nachly.in/api/choreos/feed?limit=1

# 3. Learn mode works
# Navigate to https://nachly.in/learn in browser

# 4. Stepwise player works
# Navigate to https://nachly.in/learn/any-id?mode=stepwise

# 5. Mobile OAuth works
# Run test on device/simulator
```

---

## Environment Variables Explained

### Public Variables (visible in browser)

These are safe to expose and help the client-side app connect to Supabase.

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public auth key
- `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` - Storage bucket name

### Secret Variables (server-side only)

These must NEVER be exposed to the client. Vercel keeps them server-side.

- `SUPABASE_SERVICE_ROLE_KEY` - Admin-level database access
  - Used for server-side operations only
  - Never send to browser
  - Can bypass Row-Level Security (RLS)

---

## Security Best Practices

✅ **DO:**
- Store service role key in Vercel secrets only
- Use anon key for client-side code
- Enable Row-Level Security (RLS) on all tables
- Rotate keys periodically
- Use HTTPS for all connections

❌ **DON'T:**
- Commit keys to Git (even private repos)
- Expose service role key in logs
- Use service role key in browser code
- Share credentials over unencrypted channels
- Reuse keys across environments

---

## Useful Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Expo Deep Linking](https://docs.expo.dev/guides/deep-linking/)
- [React Native Linking API](https://reactnative.dev/docs/linking)
- [Supabase OAuth Providers](https://supabase.com/docs/guides/auth/oauth-providers)

---

## Support Scripts

All helper scripts are in `scripts/`:

```bash
npm run migrate:prod        # Apply migrations to production
npm run migrate:local       # Apply migrations locally
node scripts/setup-vercel-env.js   # Interactive Vercel setup
node scripts/test-mobile-oauth.js  # Verify mobile OAuth config
```

---

## Next Steps

After completing all three tasks:

1. ✅ Migrations applied → Database ready
2. ✅ Env vars configured → Vercel deployment ready
3. ✅ OAuth tested → Mobile app users can log in

**You're now ready for production!** 🚀
