# Nachly Mobile App (React Native / Expo)

This is the mobile application for Nachly, built with React Native and Expo. It shares the same backend (Supabase) and type definitions with the Next.js web app.

## Setup

### Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (macOS) or Android Emulator
- EAS CLI for building: `npm install -g eas-cli`

### Installation

1. **Install dependencies**
```bash
cd mobile
npm install
```

2. **Configure environment**
Create `.env` file in the mobile directory:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_OAUTH_REDIRECT_URI=nachly://auth/callback
```

For Google Sign-In, add the same redirect URI in the Supabase Auth provider settings and keep the app scheme set to `nachly` in `app.json`.

3. **Start development server**
```bash
npm run start
```

4. **Run on iOS (macOS only)**
```bash
npm run ios
```

5. **Run on Android**
```bash
npm run android
```

## Project Structure

```
mobile/
├── src/
│   ├── screens/          # Screen components (Home, Explore, Learn, etc.)
│   ├── components/       # Reusable UI components
│   ├── services/         # Services (auth, API, storage)
│   ├── hooks/            # Custom React hooks
│   ├── utils/            # Utility functions
│   ├── store/            # Zustand state management
│   ├── types.ts          # TypeScript type definitions
│   └── App.tsx           # Root app component
├── assets/               # Images, icons, fonts
├── app.json              # Expo configuration
├── package.json          # Dependencies
└── tsconfig.json         # TypeScript configuration
```

## Shared Code with Web App

### Types
- Shared type definitions: `src/types.ts`
- Use `@/types` to import from web app when needed

### Services
- Authentication uses same Supabase backend
- Database queries can reuse patterns from web `/lib/supabase/queries`

### Build & Deploy

### Local Testing

```bash
# Run in development mode
npm run dev

# Test on physical device (via Expo Go app)
npm run start
```

### Build for App Stores

```bash
# Configure EAS project
eas init

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Submit to app stores
eas submit
```

## Development Notes

1. **Camera Permission**: The app requests camera permission on first use for recording practice videos
2. **Secure Storage**: Auth tokens are stored securely using `expo-secure-store`
3. **Navigation**: Uses React Navigation for bottom tab navigation (Home, Explore, Learn, Profile)
4. **State Management**: Uses Zustand for global state (auth, practice session data)
5. **Video Recording**: Uses Expo Camera API for recording practice attempts

## Performance Considerations

- Use `react-native-reanimated` for smooth animations
- Implement proper list virtualization for infinite scroll feeds
- Lazy load video thumbnails and metadata
- Cache practice data locally when possible

## Testing

```bash
npm run test
npm run type-check
```

## Troubleshooting

### Port Already in Use
```bash
# Kill the process on port 8081
lsof -ti:8081 | xargs kill -9
npm run start
```

### Cache Issues
```bash
# Clear Expo cache
rm -rf .expo
npm run start -- -c
```

### Google OAuth Redirect Issues
If Google login opens in the browser but does not return to the app:

1. Confirm `EXPO_PUBLIC_OAUTH_REDIRECT_URI` matches the redirect URI in Supabase.
2. Make sure the custom scheme `nachly://` is configured in the installed build.
3. Rebuild the dev client or production app after changing the scheme.

### Build Issues
```bash
# Clean rebuild
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## Next Steps

- Implement home feed with infinite scroll
- Build learn tab with video player
- Create recording interface with pose detection
- Add practice session tracking and scoring
- Build choreographer tools for approved creators
- Create admin dashboard access

---

**Note**: This app connects to the same Supabase backend as the web app. Development work can proceed in parallel on both platforms.
