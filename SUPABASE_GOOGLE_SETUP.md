# Enable Google Sign-In (Supabase + Google Cloud)

This document walks through the steps to enable Google OAuth for your Supabase project and configure the Google Cloud OAuth credentials that Supabase needs.

PRECONDITIONS
- You have access to the Supabase project dashboard referenced by `NEXT_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_URL`.
- You can edit environment variables for the web (`.env.local`) and mobile (`mobile/.env`) configurations.

1) Identify the Supabase project host
- Find the Supabase URL your app uses. Common env vars:
  - `NEXT_PUBLIC_SUPABASE_URL` (web)
  - `EXPO_PUBLIC_SUPABASE_URL` (mobile)
- The host looks like `https://<project-ref>.supabase.co`. Note the `<project-ref>` part — you'll use the full host below.

2) Create OAuth credentials in Google Cloud
- Open Google Cloud Console → APIs & Services → OAuth consent screen.
  - Configure the consent screen (internal or external) and add your contact/email.
- After saving the consent screen, go to APIs & Services → Credentials → Create Credentials → OAuth client ID.
  - Choose `Web application` as the Application type.
  - Name it e.g. `Nachly - Supabase Google OAuth`.
  - Add an Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback` (replace `<project-ref>.supabase.co` with your Supabase host exactly).
    - Note: For the Supabase OAuth flow you generally only need the Supabase callback URL in Google Cloud. Supabase will handle redirecting to your app's `redirectTo` after exchanging the code.
  - Create and copy the `Client ID` and `Client secret`.

3) Configure Google provider in Supabase
- Open Supabase Dashboard → Project → Authentication → Providers → Google.
  - Paste the `Client ID` and `Client Secret` from Google Cloud.
  - Toggle **Enable** (or similar) to enable the provider for the project.
  - Save the settings.

4) Confirm redirect URIs used by your app
- Web: your app may pass a `redirectTo` to Supabase (e.g., an app route). The Google credential only needs the Supabase callback (`/auth/v1/callback`). However, ensure any domain you use is configured in your Supabase project's allowed sites or CORS settings if applicable.
- Mobile (Expo): the app uses a deep link like `nachly://auth/callback`. For the typical Supabase browser-deep-link flow you do NOT add `nachly://...` to Google Cloud's redirect URIs — the Google redirect goes to Supabase, then Supabase forwards to the deep link. You must add the deep-link to your app configuration (Expo linking config) so the OS routes `nachly://` URIs back to the app.

5) Verify env vars match the configured project
- Ensure the app's env vars point to the same Supabase project where you enabled Google:
  - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (web)
  - `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` and `EXPO_PUBLIC_OAUTH_REDIRECT_URI` (mobile)
- Example mobile redirect: `EXPO_PUBLIC_OAUTH_REDIRECT_URI=nachly://auth/callback`.

6) Test the flow
- Run the app (web or mobile) and click the Google sign-in button.
- The browser should show the Google consent screen, then redirect to Supabase's callback and finally to your app's `redirectTo` route or deep link.

7) Troubleshooting
- Error: `{"msg":"Unsupported provider: provider is not enabled"}`
  - Cause: Google provider not enabled in the Supabase project you are pointing at. Fix: enable Google in Supabase Dashboard → Authentication → Providers.
  - Also verify your `*_SUPABASE_URL` and anon keys point to the same project where Google is enabled.
- Error: `redirect_uri_mismatch` when exchanging code
  - Cause: The Google OAuth credential's authorized redirect URI doesn't match `https://<project-ref>.supabase.co/auth/v1/callback`.
  - Fix: In Google Cloud Console, add the exact `https://<project-ref>.supabase.co/auth/v1/callback` URI.
- Error: `invalid_client` or `invalid_grant`
  - Cause: Wrong Client ID/Secret or timing/clock issues.
  - Fix: Re-check the values in Supabase Provider settings and ensure your server clock is correct.

8) Helpful checks & commands
- Use the included helper script to validate env vars locally:

  npm run check-supabase-env

- Determine your Supabase host from the env value (example):

  if your NEXT_PUBLIC_SUPABASE_URL is `https://abcde.supabase.co` → callback is `https://abcde.supabase.co/auth/v1/callback`

9) Security notes
- Never commit `SUPABASE_SERVICE_ROLE_KEY` or any secret to source control. Use secure environment settings for deployments (Vercel, Expo secrets, etc.).

If you want, I can:
- Walk you through the Google Cloud steps interactively (I can provide the exact menu clicks and example screenshots). 
- Verify your current env vars in this repo and point out mismatches.
