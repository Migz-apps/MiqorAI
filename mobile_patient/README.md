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
├── app.json                 # Expo app configuration
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
- Edit `app.json` for app-specific configurations (name, version, permissions, etc.)
- Update `tailwind.config.js` to customize theme colors and spacing
- Modify `src/theme.ts` for app-specific color schemes and typography

### Internationalization
- Configure languages in `src/i18n.ts`
- Add language files following the i18n setup

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

- Local data stored using AsyncStorage
- State persistence managed by Zustand
- Patient data cached locally for offline access

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
- Version bumped in `app.json`
- All tests passing
- TypeScript type checking clean
- Environment variables properly configured
- Release notes prepared

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
