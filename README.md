# Movia

Movia is a Santiago Metro companion app focused on route planning, station context, offline-first destination search, and clear trip guidance.

## Status

This repository is public for portfolio and technical evaluation purposes. It is not open source. See [LICENSE](./LICENSE) for usage restrictions.

## Mobile App

The mobile app lives in `apps/mobile` and is built with Expo, React Native, and TypeScript.

Key capabilities:

- Santiago Metro station and route experience
- offline-first points of interest foundation
- contextual route colors and line-aware UI
- location cache to reduce repeated GPS cold starts
- light/dark appearance controls
- Ruta Expresa display only when active

## Backend

The backend lives in `apps/backend` and is built with NestJS.

Key capabilities:

- authentication/session endpoints
- ETA and metro data APIs
- privacy endpoints
- metrics endpoint protected by bearer token outside local/test environments
- security smoke tests for sensitive routes

## Development

```bash
pnpm install
pnpm --filter mobile typecheck
pnpm --filter mobile lint
pnpm --filter mobile test
pnpm --filter backend build
pnpm --filter backend test
pnpm --filter backend test:e2e
```

## Android Release Candidate

The Android package is `app.movia.mobile`.

For local release APK builds, provide:

- `EXPO_PUBLIC_API_URL` with HTTPS
- `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY`

The Google Maps key must be restricted in Google Cloud to:

- package: `app.movia.mobile`
- the release certificate SHA-1
- Maps SDK for Android only

## License

All rights reserved. Public availability of this repository does not grant permission to copy, modify, distribute, host, commercialize, or reuse the code without prior written authorization.
