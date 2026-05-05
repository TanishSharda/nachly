# Native Mobile Parity Backlog

This repository is a Next.js web/PWA app. Native iOS/Android source code is not present here.

Use this backlog to mirror the latest shipped web behavior into a native codebase.

## Scope

- Explore home redesign and style entry points
- Flow filtering and style restrictions (bollywood, bhangra, mix)
- Learn controls sizing/labels and record entry
- Recording result and preview actions with readable typography and visible download/share
- Login/guest redirect behavior to app home

## Feature Parity Stories

### 1) Explore Home (Mobile)

- Build native Explore home with style chips: Bollywood, Bhangra, Mix.
- CTA routes into filtered Flow feed.
- Acceptance:
  - Tapping Bollywood opens Flow filtered to bollywood only.
  - Tapping Bhangra opens Flow filtered to bhangra only.
  - Tapping Mix opens Flow filtered to both styles.

### 2) Flow Feed Filtering

- Implement flow style filter state in native feed.
- Restrict available feed content to bollywood and bhangra only.
- Acceptance:
  - Filter values: bollywood | bhangra | mix.
  - Mix shows both styles.
  - Filter can be changed from feed header chips.

### 3) Learn Player Mobile Controls

- Apply compact control layout for small screens.
- Ensure Record action is visible on mobile (not desktop-only).
- Acceptance:
  - Title and controls do not overflow on narrow screens.
  - Record button remains visible and reachable.

### 4) Recording Result + Preview

- Use high-contrast light result modal style with dark text hierarchy.
- Keep prominent download action and secondary save/preview/copy-link actions.
- Acceptance:
  - Result text is readable outdoors and in bright environments.
  - Download and share-link actions are visible without scrolling on common device heights.

### 5) Login + Guest Routing

- Route successful login and guest entry to app home experience.
- Maintain redirect param handling from campaign/deep links.
- Acceptance:
  - Post-login lands in app home.
  - Guest entry lands in app home and can access Flow.

## Native-Specific Technical Notes

- Video save/share differs by platform; verify iOS Save to Files and Android Downloads behavior.
- If web currently exports webm, add mp4 export/transcode fallback for iOS compatibility.
- Match analytics event names used on web for style filters and recording result actions.

## QA Matrix

- iOS: latest Safari PWA baseline behavior + native app build
- Android: latest Chrome + native app build
- Devices: at least one compact phone and one large phone per platform

## Delivery Order

1. Flow filter engine + content gating
2. Explore to Flow style entry links
3. Learn controls and record entry
4. Recording result/preview action parity
5. Login/guest redirect contract
