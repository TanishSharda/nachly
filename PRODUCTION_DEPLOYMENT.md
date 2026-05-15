# Production Deployment Checklist

## Task 1: Set Up Supabase Migrations

The application uses PostgreSQL migrations in `supabase/migrations/` directory (001-018+.sql files).

### Approach Options:

**Option A: Via Supabase CLI (Recommended if you have access)**
```bash
# 1. Create .env.production with your credentials
NEXT_PUBLIC_SUPABASE_URL=https://lzcngsbfrkcqupuvqdrk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
SUPABASE_DB_PASSWORD=<your_database_password>

# 2. Login to Supabase CLI (requires browser interaction)
npx supabase login

# 3. Link to your project
npx supabase link --project-ref lzcngsbfrkcqupuvqdrk

# 4. Push migrations
npx supabase db push
```

**Option B: Via Supabase SQL Editor (Manual)**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `lzcngsbfrkcqupuvqdrk`
3. Navigate to SQL Editor
4. Run migrations in order (001 → 018)
5. Each file is already idempotent (uses IF NOT EXISTS)

**Option C: Via Node.js Migration Script**
```bash
# Set environment variables
$env:NEXT_PUBLIC_SUPABASE_URL="https://lzcngsbfrkcqupuvqdrk.supabase.co"
$env:SUPABASE_DB_PASSWORD="<your_database_password>"

# Run migrations
npm run migrate:prod
```

### Getting Required Keys:
1. Supabase Dashboard → Project Settings → API
2. Copy "service_role" key for server-side app usage only
3. Supabase Dashboard → Project Settings → Database
4. Copy the database password for migration runs only
5. Never commit either secret to Git

### Key Tables Created:
- `choreo_submissions` - User choreography submissions with AI scoring
- `routine_videos` - Performance videos linked to routines
- `profiles` - User profiles with preferences
- And many others (see supabase/migrations/ for full schema)

---

## Task 2: Configure Production Environment Variables

### For Vercel Deployment:

```bash
# 1. Authenticate with Vercel
vercel login

# 2. Add environment variables to production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production

# 3. Verify they're set
vercel env list

# 4. Deploy
vercel deploy --prod
```

### Required Environment Variables:

**Public (safe to expose):**
- `NEXT_PUBLIC_SUPABASE_URL` - https://lzcngsbfrkcqupuvqdrk.supabase.co
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` - "choreographer-uploads" (optional)

**Server-side only (secret):**
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (NEVER expose)

### Vercel Command Reference:

```bash
# View current env vars
vercel env list

# Add a new var (interactive)
vercel env add MY_VAR production

# Add with value directly
vercel env add MY_VAR production my-value

# Remove a var
vercel env remove MY_VAR production

# Pull from Vercel to .env.production.local
vercel env pull .env.production.local
```

---

## Task 3: Test Mobile OAuth Deep-Link

### Prerequisites:
- Supabase project configured with Google OAuth
- Expo app set up with deep-link URI scheme
- Mobile device or EAS dev build

### Step 1: Configure Supabase OAuth Provider

1. **Supabase Dashboard** → Authentication → Providers
2. **Google** provider - Verify enabled
3. Check redirect URI includes: `nachly://auth/callback`
4. Save OAuth credentials

### Step 2: Configure Expo Deep Links

In `mobile/app.json`:
```json
{
  "expo": {
    "scheme": "nachly",
    "plugins": [
      [
        "expo-notifications",
        { "icon": "./assets/notification-icon.png" }
      ]
    ]
  }
}
```

In `eas.json` (if using EAS builds):
```json
{
  "build": {
    "preview": {
      "ios": {
        "scheme": "nachly"
      },
      "android": {
        "scheme": "nachly"
      }
    }
  }
}
```

### Step 3: Test Deep-Link Flow

**On Expo Go (dev build):**
```bash
cd mobile
expo start
# Scan QR code on device
# Open app → tap "Sign in with Google"
# Should redirect to browser, then back to app
```

**On EAS Build:**
```bash
eas build --platform android --profile preview
eas build --platform ios --profile preview

# Install on device
# Test OAuth flow
```

### Step 4: Validate Implementation

The mobile OAuth implementation in `mobile/src/services/auth.ts`:

```typescript
export async function signinWithOAuth() {
  try {
    // Opens browser for Google OAuth
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "nachly://auth/callback",
      },
    });

    if (error) throw error;

    // Wait for deep-link callback (max 90 seconds)
    const session = await waitForDeepLink();
    
    if (session) {
      // Store securely on device
      await SecureStore.setItemAsync("userSession", JSON.stringify(session));
      return session;
    }
  } catch (error) {
    console.error("OAuth failed:", error);
  }
}

// Listens for deep-link callback
async function waitForDeepLink(): Promise<Session | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      listener.remove?.();
      resolve(null);
    }, 90000); // 90 second timeout

    const listener = Linking.addEventListener("url", ({ url }) => {
      clearTimeout(timeout);
      listener.remove?.();
      // Handle callback...
      resolve(session);
    });
  });
}
```

### Troubleshooting Mobile OAuth:

| Issue | Solution |
|-------|----------|
| Deep-link not opening app | Verify `scheme` in app.json matches "nachly" |
| Redirect URI mismatch error | Check Supabase OAuth settings has `nachly://auth/callback` |
| Browser doesn't redirect | Confirm Supabase OAuth provider is enabled |
| "Already exists" errors | Migrations are idempotent; safe to re-run |
| Session not saved | Verify `expo-secure-store` is installed in mobile/ |

---

## Deployment Order:

1. ✅ **Migrations** - Apply schema changes first
2. ✅ **Environment Vars** - Configure secrets in Vercel
3. ✅ **Deploy Code** - Push updated code with new queries
4. ✅ **Test OAuth** - Verify mobile deep-link works in prod

---

## Verification Checklist:

After deploying to production:

- [ ] Supabase migrations applied (check SQL Editor)
- [ ] Environment variables set in Vercel
- [ ] App deployed successfully (check Vercel dashboard)
- [ ] `/scroll` feed loads choreography
- [ ] `/learn` tab shows tutorials
- [ ] `/learn/[id]?mode=stepwise` loads player with step controls
- [ ] Mobile OAuth: Browser opens → user approves → app receives session
- [ ] No 500 errors in /api/choreos endpoints
