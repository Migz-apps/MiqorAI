# MiqorAI - Mobile Patient App

A comprehensive React Native mobile application for patients to manage, organize, and share their medical records securely. Built with Expo, TypeScript, and NativeWind styling.

## Features

- **Medical Records Management** - Organize and view patient medical records in one centralized location
- **Record Sharing** - Share medical records with family members and designated contacts
- **Family Management** - Add and manage family member profiles
- **QR Code Sharing** - Generate and scan QR codes for quick record sharing
- **Emergency Contacts** - Maintain a list of emergency contacts with quick access
- **Offline Support** - Access and manage records with offline capability
- **Multi-Language Support** - Internationalization support for multiple languages
- **User Profile Management** - Customize user profile and preferences
- **Data Export** - Export medical records for personal backup or sharing
- **Responsive Design** - Optimized UI for various mobile device sizes
- **Settings & Preferences** - Customizable app settings including language selection, privacy controls, and terms/policies

## Tech Stack

- **Framework**: React Native with Expo
- **Language**: TypeScript
- **Styling**: Tailwind CSS (via NativeWind)
- **State Management**: Zustand
- **Storage**: AsyncStorage
- **QR Code**: react-native-qrcode-svg
- **Icons**: Lucide React Native
- **Date Handling**: date-fns
- **UI Components**: Expo modules (LinearGradient, StatusBar, SafeAreaContext)
- **Build Tool**: Metro (configured via metro.config.js)

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v18 or higher)
- npm or yarn package manager
- Expo CLI (`npm install -g expo-cli`)
- For iOS development: macOS with Xcode
- For Android development: Android Studio with SDK
- Git

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/MiqorAI.git
   cd MiqorAI/mobile_patient
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Verify setup**
   ```bash
   npm run doctor
   ```
   This command checks your development environment for any issues.

## Project Structure

```
mobile_patient/
├── src/
│   ├── components/
│   │   ├── family/          # Family management components
│   │   ├── onboarding/      # Onboarding flow components
│   │   ├── profile/         # User profile components
│   │   ├── records/         # Medical records components
│   │   ├── sharing/         # Record sharing components
│   │   └── ui/              # Reusable UI components
│   ├── screens/             # Main app screens
│   │   ├── settings/        # Settings sub-screens
│   │   ├── FamilyScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── OnboardingScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   ├── RecordsScreen.tsx
│   │   ├── SettingsPages.tsx
│   │   └── ShareScreen.tsx
│   ├── i18n.ts              # Internationalization configuration
│   ├── store.ts             # Zustand state management store
│   ├── theme.ts             # Theme configuration and colors
│   ├── theme-bridge.tsx     # Theme integration bridge
│   ├── responsive.ts        # Responsive design utilities
│   └── utils.ts             # Utility functions
├── App.tsx                  # Main application entry point
├── app.config.ts            # Expo app configuration (source of truth; android/ios are generated)
├── package.json             # Project dependencies
├── tsconfig.json            # TypeScript configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── nativewind-env.d.ts      # NativeWind type definitions
├── metro.config.js          # Metro bundler configuration
├── postcss.config.js        # PostCSS configuration
├── babel.config.js          # Babel configuration
└── global.css               # Global styles
```

## Getting Started

### Running on Development

Start the Expo development server:
```bash
npm start
```

### Testing On A Physical Android Phone With Expo Go

For your current setup, where the phone provides the hotspot and the computer joins it:

1. Keep the backend running on your computer on port `3000`.
2. Start the Expo app from `mobile_patient`.
3. If Expo Go cannot reach the backend automatically, create a local `.env` from `.env.local.example`.
4. Set `EXPO_PUBLIC_API_URL` to your computer's hotspot IP, for example `http://192.168.x.x:3000`.
5. Restart Expo after changing the `.env` file.

In development, the app now tries to derive your computer's host IP from the Metro bundle URL before falling back to emulator-only addresses. In production builds, it uses `EXPO_PUBLIC_API_URL` and falls back to the deployed backend instead of localhost-style addresses.

### Expo Go Compatibility

This project should be kept on the same Expo SDK major version as the Expo Go app installed on the phone.

- Expo Go `54.0.6` requires an Expo SDK 54 project.
- A newer Expo SDK such as 55 or 56 will not be reliably compatible with that Expo Go client.
- Full compatibility with every Expo Go version is not possible; the app must match the installed Expo Go SDK family.

### Local First, Deployed Later

For this mobile testing pass, use the local backend first by creating a local `.env` from `.env.local.example`.

The default `.env.example` and `.env.production.example` already target the deployed backend. When you do the final whole-system test later, keep `EXPO_PUBLIC_API_URL` pointed at the deployed backend URL and re-test login, dashboard loading, records, QR generation, grants, and exports against the deployed environment too.

### iOS Development
```bash
npm run ios
```

This opens the iOS simulator and runs the app.

### Android Development
```bash
npm run android
```

This opens the Android emulator and runs the app.

### Web Development
```bash
npm run web
```

Runs the app in a web browser (useful for testing responsive design).

## Configuration

### Environment Setup
- Edit `app.config.ts` for app-specific configurations (name, permissions, icons, etc.); the version lives in `src/version.json`
- Update `tailwind.config.js` to customize theme colors and spacing
- Modify `src/theme.ts` for app-specific color schemes and typography

### Internationalization
- Strings live in `src/locales/<area>.ts` (one module per screen group, each with `en`, `rw` and `fr`), merged in `src/locales/index.ts`
- In components: `const { t } = useTranslation()` from `src/i18n.ts`; `t('ns.key', { name })` interpolates `{{name}}`, and a numeric `count` selects `key_one` / `key_other`
- Outside components use `translate()` (`src/i18n.ts`) or `translateFor(language, ...)` (`src/locales`)
- Missing keys fall back to English; `npm test` fails if the three languages have different keys or placeholders
- The language picker (Profile > Language) updates the persisted store, so the UI switches immediately

### State Management
- Global app state is managed through the Zustand store in `src/store.ts`
- Patient data, authentication status, and UI state are centralized

### Responsive Design
- Use `src/responsive.ts` utilities for device-aware layouts
- Leverage NativeWind classes for consistent styling across screen sizes

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo development server |
| `npm run ios` | Run on iOS simulator |
| `npm run android` | Run on Android emulator |
| `npm run web` | Run in web browser |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run doctor` | Verify Expo setup and diagnose issues |

## Build for Production

### iOS Build
```bash
eas build --platform ios
```

### Android Build
```bash
eas build --platform android
```

Note: Requires EAS (Expo Application Services) account setup.

## Core Components

### UI Components (`src/components/ui/`)
- **buttons.tsx** - Button components with various styles
- **cards.tsx** - Card containers and layouts
- **forms.tsx** - Form inputs and form-related components
- **layout.tsx** - Layout wrapper components
- **modals.tsx** - Modal dialogs
- **feedback.tsx** - Loading, error, and success feedback components
- **qr.tsx** - QR code display and generation

### Screen Components (`src/screens/`)
- **HomeScreen** - Dashboard and main view
- **LoginScreen** - Authentication screen
- **OnboardingScreen** - Initial user setup flow
- **RecordsScreen** - View and manage medical records
- **FamilyScreen** - Manage family members
- **ProfileScreen** - User profile management
- **ShareScreen** - Share records with others
- **SettingsPages** - App settings and preferences

### Feature Components (`src/components/`)
- **feature/** - Dedicated components for specific features

## Offline Support

The app supports offline functionality:
- Records are cached locally using AsyncStorage
- Changes are queued when offline
- Auto-sync when connection is restored
- Offline status indicator in the app

## Data Storage

- State persistence is managed by Zustand through `src/lib/persist-layout.ts` and the AES-encrypted adapter `src/lib/secure-storage.ts` (key in expo-secure-store)
- Key layout (`MiqorAI-mobile-storage` prefix):
  - `:core` holds the session, profile and settings (small)
  - `:c:<collection>` holds one key per large collection (medications, labResults, appointments, activityLog, ...)
  - an encrypted value above 512 KB is split into `<key>.chunk.<generation>.<n>` keys behind a manifest, so no row approaches Android's ~2 MB read limit
- Writes are debounced (500 ms) and unchanged keys are skipped; sign-in/out and token rotation are written immediately, and pending writes flush when the app goes to the background
- The activity log keeps the newest 500 entries on the device
- The old single-row value is migrated to this layout on first launch and then deleted; an unreadable collection loads as empty instead of failing startup

## Performance Optimization

- TypeScript for type safety and better IDE support
- Code splitting with component-based architecture
- Optimized re-renders with Zustand selectors
- Responsive image handling for various screen sizes

## Troubleshooting

### Common Issues

**Port already in use**
```bash
# Kill process on port 8081
# macOS/Linux:
lsof -ti:8081 | xargs kill -9

# Windows:
netstat -ano | findstr :8081
taskkill /PID <PID> /F
```

**Dependencies not installed**
```bash
rm -rf node_modules
npm install
```

**TypeScript errors**
Run type checking:
```bash
npm run typecheck
```

**Expo doctor**
Diagnose environment issues:
```bash
npm run doctor
```

## Contributing

1. Create a feature branch from the main branch
2. Make your changes following the existing code style
3. Ensure all TypeScript checks pass
4. Submit a pull request with a clear description

## Code Style

- Use TypeScript for all components
- Follow React hooks best practices
- Use Zustand for state management
- Leverage Tailwind CSS classes for styling
- Follow the existing folder structure

## Testing

`npm test` runs the Node unit tests in `tests/` (storage chunking/split/migration, QR retry backoff, translation key parity) with `tsx`; they need no device or native modules.

Ensure your changes are properly tested:
- Component rendering
- State management flow
- Offline functionality
- Screen navigation

## Support

For issues, bug reports, or feature requests, please open an issue in the repository.

## License

This project is proprietary software. All rights reserved.

## Privacy & Terms

Users can access:
- Privacy Policy - Review data collection and usage practices
- Terms of Service - Review usage terms and conditions
- Help & Support - Get assistance and FAQs

## Deployment

For production deployment, ensure:
- Version bumped in `src/version.json` (and `android.versionCode` in `app.config.ts`)
- All tests passing
- TypeScript type checking clean
- Environment variables properly configured
- Release notes prepared

### Release signing (CI)

`.github/workflows/build-patient-mobile-apk.yml` signs the release APK with an upload keystore from repository secrets and fails if they are missing. Pushes to `master`/`main` produce a workflow artifact; pushing a `v*` tag also publishes a GitHub Release.

1. Generate the keystore once (JDK `keytool`) and keep it, plus its passwords, somewhere safe outside the repo. Losing it means existing installs can no longer be updated.

   ```bash
   keytool -genkeypair -v -storetype JKS -keystore miqorai-upload.jks \
     -alias miqorai-upload -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Base64-encode it.

   ```powershell
   # Windows PowerShell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("$PWD\miqorai-upload.jks")) | Set-Clipboard
   ```

   ```bash
   # macOS / Linux
   base64 < miqorai-upload.jks | tr -d '\n'
   ```

3. Add these secrets under **Settings > Secrets and variables > Actions**:

   | Secret | Value |
   | --- | --- |
   | `ANDROID_KEYSTORE_BASE64` | output of step 2 |
   | `ANDROID_KEYSTORE_PASSWORD` | keystore password |
   | `ANDROID_KEY_ALIAS` | `miqorai-upload` (the `-alias` used above) |
   | `ANDROID_KEY_PASSWORD` | key password (same as the keystore password unless set separately) |

### API URL per build profile

The API base URL is read from `process.env.EXPO_PUBLIC_API_URL` at build time (`src/lib/api.ts`). `eas.json` sets it for the `preview` and `production` profiles (currently `https://miqorai.onrender.com`); change it there when the production API moves (for example to `https://api.miqorai.com`). Development builds fall back to the Metro host on port `EXPO_PUBLIC_API_PORT` only when `__DEV__`; a release build never uses a local address.

### Cleartext traffic and native config

`app.config.ts` is the source of truth: `android/` and `ios/` are generated by prebuild/EAS and gitignored, so settings such as `newArchEnabled` (currently `false`) are changed there. Plain-http traffic is refused in preview/production builds; debug builds (and EAS `development` builds, or `APP_VARIANT=development` locally) allow it so a dev client can reach a local API.

### App icon and splash

`assets/icon.png`, `assets/adaptive-icon.png` and `assets/splash-icon.png` are placeholder brand assets (an "M" monogram on the theme's primary color) produced by `npm run assets:generate` (`scripts/generate-brand-assets.js`, Node built-ins only). Replace them with final artwork at the same sizes (1024x1024) when available.

## Additional Resources

- [Expo Documentation](https://docs.expo.dev)
- [React Native Documentation](https://reactnative.dev)
- [NativeWind Documentation](https://www.nativewind.dev)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.

---

**Version**: 1.0.0  
**Last Updated**: 2026  
**Maintainers**: MiqorAI Team
