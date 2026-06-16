Movia

Movia is an independent urban mobility project built to improve subway navigation experiences in Santiago, Chile, with expansion work for Brazil.

The project combines a mobile app, backend APIs, routing logic, geolocation, ETA calculation, privacy features and security practices in a full-stack architecture.

«Disclaimer: Movia is an independent portfolio project. It is not an official Metro de Santiago app or affiliated with any public transportation operator.»

---

Overview

Movia was created to help users plan subway trips, understand routes more clearly and follow their journey through a visual mobile experience.

The Santiago version currently includes route planning, station search, estimated travel time, current station, next station, line direction, visual timeline and transfer guidance.

The project is also being adapted for Brazil, with the first Android APK version generated for local testing.

---

Screenshots

«Replace these paths with your actual screenshot files.»

Route Navigation| Multi-Line Support| Transfer Guidance
"Route Navigation" (docs/screenshots/santiago-route.png)| "Line Support" (docs/screenshots/santiago-line.png)| "Transfer Guidance" (docs/screenshots/santiago-transfer.png)

---

Main Features

- Mobile app built with React Native, Expo and TypeScript
- Route planning with origin and destination
- Station search
- Nearby station suggestion using device location
- Estimated travel time
- Current station and next station display
- Visual route timeline
- Line direction display
- Transfer guidance between subway lines
- Line-based visual colors
- Multilingual interface: Spanish, Portuguese and English
- Backend API built with NestJS
- PostgreSQL database using Prisma
- Graph-based routing engine
- ETA engine
- Privacy endpoints and consent flow
- Structured backend logs
- Repository security checks
- Docker-based backend setup
- Offline-first navigation strategy under development

---

Offline-First Navigation Strategy

Movia is designed with an offline-first approach for subway environments, where internet and GPS signals may be unstable.

The app should not depend entirely on continuous internet access or high-precision GPS during a trip. Instead, it loads route data before the journey and keeps key information available locally, such as:

- station sequence;
- line information;
- transfer points;
- estimated travel time;
- current route progress;
- next station.

The planned navigation logic separates visual anticipation from station confirmation:

const STATION_APPROACH_RADIUS_METERS = 150;
const STATION_APPROACH_TIME_SECONDS = 30;

const STATION_ARRIVAL_RADIUS_METERS = 50;
const STATION_STOP_SPEED_MPS = 1;

Planned behavior:

1. Around 150 meters or 30 seconds before the next station, the app prepares the visual UI:
   
   - updates the timeline;
   - highlights the next station;
   - shows an approaching state;
   - does not trigger a notification.

2. Within 50 meters of a station and with speed below 1 m/s, the app confirms the current station.

3. Notifications are intentionally limited:
   
   - no notification for every station;
   - no transfer notification;
   - no final arrival notification;
   - only one notification is planned: the station before the final destination.

This approach reduces noise, saves battery and improves reliability in underground subway environments.

---

Tech Stack

Mobile

- React Native
- Expo
- TypeScript
- JavaScript
- Expo Location
- Mobile UX
- Geolocation
- Offline-first navigation strategy

Backend

- NestJS
- Node.js
- REST APIs
- PostgreSQL
- Prisma ORM
- JWT Authentication
- Role-based access control
- Structured logs

Infrastructure and Tooling

- Monorepo architecture
- pnpm
- Turborepo
- Docker
- Cloud Run staging
- GitHub
- Security auditing
- Environment variable hygiene

---

Architecture

The project follows a monorepo structure:

movia/
├── apps/
│   ├── mobile/
│   └── backend/
├── packages/
├── docs/
├── infra/
├── scripts/
├── .github/
├── .env.example
├── package.json
├── pnpm-lock.yaml
└── README.md

Main Layers

- Mobile app: user interface, maps, navigation flow and route visualization.
- Backend API: authentication, route services, ETA, privacy and data access.
- Database: subway network data, stations, lines, segments and related entities.
- Routing engine: graph-based route calculation.
- Security layer: authentication, authorization, payload validation and repository hygiene.

---

Routing and ETA

Movia uses a graph-based routing model to represent subway stations, platforms, segments and transfers.

The routing engine is designed to support:

- shortest path calculation;
- transfer penalties;
- line direction;
- ETA estimation;
- station sequence generation;
- route visualization in the mobile app.

This allows the app to display not only the final route, but also intermediate stations, transfer points and estimated travel time.

---

Security and Privacy

Movia includes security and privacy practices from the early stages of development.

Current measures include:

- proprietary/source-available license;
- real ".env" files excluded from Git;
- ".env.example" with placeholders only;
- repository secret scanning;
- Google Maps key kept out of tracked files;
- JWT-based authentication;
- role-based access control;
- payload validation;
- privacy endpoints;
- consent-related flows;
- structured logs;
- Docker non-root backend container;
- dependency audit with pnpm.

Planned hardening steps include:

- route-specific rate limiting;
- stronger abuse logging;
- Google Cloud budget alerts;
- Secret Manager integration;
- least-privilege IAM;
- backup and restore validation;
- production observability;
- public privacy policy and terms.

---

Current Status

Movia Santiago

Status: advanced validation / pre-beta

The Santiago version is functional and has been tested in real subway usage scenarios. Current work focuses on:

- visual navigation refinement;
- notification policy simplification;
- offline-first behavior;
- UX improvements;
- field validation;
- API hardening before broader testing.

Movia Brazil

Status: APK 1.0 generated for local testing

The Brazil version has its first Android APK build generated and is currently in early validation.

---

Local Development

«Commands may vary depending on your environment.»

Install dependencies:

pnpm install

Run mobile app:

pnpm --filter mobile start

Run backend:

pnpm --filter backend start:dev

Run typecheck:

pnpm --filter mobile typecheck
pnpm --filter backend build

Run tests:

pnpm --filter backend test
pnpm --filter backend test:e2e

Run dependency audit:

pnpm audit
pnpm audit --prod

---

Environment Variables

This repository does not include real secrets.

Use ".env.example" as a reference and create local ".env" files as needed.

Do not commit:

- real database URLs;
- JWT secrets;
- Google Maps API keys;
- private keys;
- service account files;
- APK/AAB/IPA builds;
- local machine configuration files.

---

Roadmap

- Refine Santiago navigation experience
- Implement visual station approach logic
- Confirm station arrival using distance and speed
- Reduce notifications to only the station before final destination
- Improve offline-first route continuity
- Harden API security
- Add route-specific rate limiting
- Improve monitoring and logs
- Prepare controlled beta testing
- Improve README and technical documentation
- Record demo video for portfolio

---

License

This project is source-available for portfolio and technical evaluation purposes only.

It is not open source.

You may view the code for evaluation, but you are not allowed to copy, modify, distribute, host, sell, sublicense or reuse the code without prior written permission from the author.

See the "LICENSE" (LICENSE) file for details.

## License

This project is source-available for portfolio and technical evaluation purposes only. It is not open source. Copying, modifying, compiling, distributing, hosting, selling, or reusing the code requires prior written permission from the author.

See [LICENSE](./LICENSE).

---

Author

Fred Leal
Mobile Developer focused on React Native, Expo and TypeScript.

- GitHub: "frednery7-hub" (https://github.com/frednery7-hub)
- LinkedIn: https://www.linkedin.com/in/fred-leal-52226b417
- Location: Santiago, Chile
