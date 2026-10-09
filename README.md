# Bukora

**A small, offline-first booking and payment ledger for independent accommodation and venue businesses.**

Bukora helps an owner or small team keep reservations, guest details, charges, payments, and booking changes together in one place. It is designed for businesses that currently rely on notebooks or spreadsheets and want a clearer day-to-day view without requiring an online account or a hosted service.

The app began with Cenere Beach House's night-use booking workflow. It is free and open source under the [MIT License](LICENSE), and other owners are welcome to run it, adapt it, and contribute improvements under that license.

> **Current product scope:** Bukora is a local booking ledger, not a public booking marketplace or an online reservation service. Guests do not book through a website, and records do not sync between devices. Each installation keeps its own data; use the built-in backup and restore tools to move or safeguard records.

## Who Bukora is for

Bukora may be useful to an owner-operated beach house, guesthouse, cabin, small event venue, or similar business that needs to:

- see upcoming bookings and balances due from a dashboard;
- record guest contact details, party size, dates, and notes;
- quote a stay using a base package and optional items;
- record deposits, later payments, refunds, and transaction references;
- reschedule or cancel a booking while keeping a history of changes;
- keep the working ledger available on a phone without a network connection.

It does not currently provide online payment collection, customer accounts, automatic messaging, channel-manager integrations, multi-user access control, or cloud synchronization. It is intended for a small owner or team using a trusted device, not as a hosted multi-tenant service.

## How it can support a business

Bukora gives the owner a repeatable record for the booking lifecycle:

1. **Take an inquiry or reservation** and enter the guest, dates, party size, and notes.
2. **Build a quote** from the package, room and amenity choices, and any custom charges or discount.
3. **Check the calendar** for overlapping active reservations before saving.
4. **Record each payment** as it arrives, including the date, method, and optional transaction number. A booking becomes confirmed when net payments reach its saved confirmation deposit amount.
5. **Review the remaining balance** and the activity history from the booking or payments views.
6. **Change or cancel the reservation** when plans change; keep the event in the record rather than losing it in a notebook.
7. **Back up the ledger** and restore it on a device when needed.

This can make handoffs and end-of-day reviews more consistent: the owner can see what was booked, what was charged, what has been paid, and what changed. Bukora is a record-keeping aid; it does not replace accounting, tax, legal, or payment-provider records.

## Features

- **Dashboard:** upcoming reservations, balances due, and recent payment activity.
- **Bookings:** create and search bookings, browse a calendar, and filter active or cancelled records.
- **Booking details:** guest information, date range, itemized price, payments, outstanding balance, and activity history.
- **Booking changes:** edit guest details, reschedule, and cancel with history recorded.
- **Deposit-based confirmation:** new bookings are tentative until the configured initial payment is recorded. Bukora records the automatic confirmation in the booking history.
- **Flexible line items:** add custom charges such as catering or appliance use, or discounts. Party size is recorded for information and does not add a per-person fee.
- **Payments:** record multiple payments and refunds with date, method, transaction reference, and notes.
- **Settings:** customize the in-app display name, property name, default package prices, confirmation deposit, and currency.
- **Backup and restore:** export a versioned backup and validate it before replacing the current ledger.
- **Offline storage:** native iOS and Android builds use SQLite on the device. No network is required for booking work.

## Example pricing and customization

The repository's initial settings demonstrate Cenere Beach House's current package:

| Item | Example default |
| --- | ---: |
| Night use, including one room | ₱5,900 |
| Optional second room | +₱1,800 |
| Videoke when only one room is booked | +₱800 |
| Videoke when the second room is included | Free |

These are **sample defaults**, not required Bukora prices. A new owner can change the display name, property name, prices, confirmation deposit, and currency in Settings. Cenere's sample confirmation deposit is ₱1,000. Each booking saves a snapshot of its quoted items and required deposit, so changing defaults later does not rewrite an existing reservation. Set the confirmation deposit to ₱0 when no initial payment is required; those bookings are confirmed as soon as they are created.

Tentative bookings still hold their dates against overlapping bookings, so an unpaid reservation cannot accidentally be double-booked. Cancel a tentative booking to release its dates. A confirmed booking remains confirmed if a refund is later recorded; cancel it explicitly to release the reservation.

The current booking rules model one night-use package, one included room, an optional second room, and the videoke rule above. The app supports custom charge and discount lines, but a business with a different package structure or different room/amenity rules may need to adapt the quote rules in the source code. There is no general package editor yet.

## Screens and navigation

The mobile interface follows the supplied hotel-app reference's calm, image-friendly style: light surfaces, rounded cards and controls, generous spacing, readable booking summaries, and restrained green accents for primary actions and selected states. Bukora adapts that visual direction to a single business ledger rather than travel discovery.

The main sections are **Dashboard**, **Bookings**, **Payments**, and **Settings**. The booking flow also includes calendar selection, a live price breakdown, and a booking detail view. The interface is built with React Native and Expo Router so shared screens and UI components work across iOS, Android, and the browser preview.

## Technology and architecture

- **Expo SDK 54**, **React Native 0.81**, and **TypeScript** for cross-platform app development.
- **Expo Router** for navigation.
- **Expo SQLite** and **Drizzle ORM** for native local persistence and migrations.
- **UUID text IDs** for bookings, line items, payments, and activity records.
- **Integer minor currency units** for stored amounts to avoid floating-point money calculations.
- **NativeWind 4 and Tailwind CSS 3** for shared styling.
- **Zod** for validating domain data and imported backups.
- **Jest** and React Native Testing Library for automated tests.
- **Docker Compose** for a reproducible development web preview.

The code is organized around app screens, application services, domain rules and repository contracts, and platform-specific data adapters. Business rules such as quote totals and booking balances live in shared domain code; native SQLite and browser preview storage are separate adapters. This supports SOLID and DRY goals without creating abstractions that the app does not need.

### Data model at a glance

The local ledger currently uses these tables:

| Table | Purpose |
| --- | --- |
| `bookings` | Guest details, reservation status, dates, saved confirmation deposit, notes, and timestamps. |
| `booking_line_items` | A price snapshot for the package, included or additional options, custom charges, and discounts. |
| `payments` | Payment and refund entries, including optional transaction references. |
| `booking_activity` | A history of booking, payment, rescheduling, and cancellation events. |
| `app_settings` | Owner-configurable display, pricing, and confirmation deposit settings. |

See [`db/schema.ts`](db/schema.ts) for the authoritative schema and [`drizzle/`](drizzle/) for SQLite migrations. Booking dates are local calendar dates stored as `YYYY-MM-DD`; timestamps use ISO 8601. Amounts use integer minor units (for example, ₱5,900 is stored as `590000` centavos). UUID values are stored as text.

## Requirements

- Node.js 22 LTS (the Docker image uses Node 22).
- Bun 1.3.10, pinned in `package.json` and used for installing dependencies and running project scripts.
- Git to clone the repository.
- For a native iOS build: macOS with Xcode and its command-line tools.
- For a native Android build: Android Studio, Android SDK, and a compatible Java/JDK installation.
- Docker Desktop or Docker Engine with the Compose plugin for the containerized web preview.

You can use the web preview for an initial look without setting up Xcode or Android Studio. The web preview is useful for development, but native SQLite behavior must be exercised in a native build.

## Run locally

Install [Node.js 22 LTS](https://nodejs.org/) and [Bun](https://bun.sh/docs/installation) 1.3.10. Check `bun --version` against the version pinned in `package.json`, then clone the repository and install the locked dependencies:

```sh
git clone https://github.com/rceniza/bukora.git
cd bukora
bun install --frozen-lockfile
```

Start the Expo development server:

```sh
bun run start
```

Then use the Expo CLI prompts to open the app in an available simulator, on a connected device with Expo Go where supported, or in a web browser. You can also start a platform directly:

```sh
bun run ios       # requires macOS and Xcode
bun run android   # requires Android Studio, SDK, and Java
bun run web       # starts the browser preview
```

The native `ios` and `android` scripts build and run the native app; having the Expo JavaScript bundle alone is not enough to provide those platforms' native modules.

Bun is the repository's only package manager; `bun.lock` is the committed dependency lockfile. Bun changes how dependencies are installed, not which upstream packages the app depends on. Some packages may still carry deprecation notices in registry metadata even when Bun does not print npm's warnings.

## Run the web preview with Docker

From the repository root:

```sh
docker compose up --build
```

Open [http://localhost:8081](http://localhost:8081). Stop the preview with `Ctrl+C`; use `docker compose down` to stop and remove the Compose container. Docker is a development and web-preview environment, not a server required by the native app.

The browser preview uses browser-local storage as its development persistence adapter. Its records live in that browser profile and are separate from an iOS or Android SQLite database. Clearing browser site data can remove preview records, so export a backup before doing so. The Compose setup does not expose a hosted database or synchronize data.

## Configure Bukora for another business

1. Run the app and open **Settings**.
2. Replace the sample property name with your business name.
3. Set the in-app display name, currency, and default package prices.
4. Create a test booking and review the quote, payment, balance, and backup screens before entering live records.
5. Export a backup on a regular schedule and store it somewhere separate from the device.

For a private custom build, update the app's native project identity in [`app.json`](app.json), including the iOS bundle identifier and Android package name, before distributing your build. The name in Settings changes the in-app business identity; it does not change the installed app's launcher label or native bundle/package identifiers. Those are build-time settings.

If your business uses different booking options or eligibility rules, update the shared quote logic and its tests in `src/domain/services/bookingQuote.ts`, then review the booking form and saved line-item descriptions. To change the data model, edit `db/schema.ts`, generate and review a forward migration, and add tests for both the schema behavior and the user flow. Do not change historical line-item snapshots just to change today's defaults.

### Data and privacy notes

- Native booking records are stored locally on the device in SQLite. The app currently has no login, cloud backup, or automatic synchronization.
- The browser preview stores records in the browser's local storage and is not a substitute for the native SQLite database.
- Backups include guest contact details, bookings, payments, settings, and activity history. Treat backup files as sensitive personal and business data; protect them and share them only with people who should see those records.
- Restoring a backup replaces the current ledger after validation and an explicit confirmation. Keep a separate copy of any records you need before restoring.
- Device loss, app deletion, browser-data cleanup, or storage failure can make local-only records unavailable. Export and test a backup regularly.

## Tests and quality checks

Install dependencies first with `bun install --frozen-lockfile`, then run:

```sh
bun run test -- --runInBand  # unit and feature-level Jest tests
bun run lint                 # Expo ESLint checks
bun run typecheck            # TypeScript check without emitting files
```

For an interactive test run while developing:

```sh
bun run test:watch
```

When changing the database schema, generate a migration with:

```sh
bun run db:generate
```

Review the generated SQL and migration metadata before committing. Add focused tests for domain rules and persistence behavior, plus a feature-level test for the screen or flow affected. Before a release, exercise create, edit, reschedule, cancel, payment, refund, backup, and restore flows on the platforms you intend to distribute. In particular, verify native SQLite and offline behavior in an iOS or Android build; a passing browser test does not verify native storage.

The repository's `docker-compose.yml` starts the web preview; it does not define a separate test container. Run the quality commands on the host or add an explicitly reviewed CI/test container for your workflow.

## Contributing

Issues and pull requests are welcome. Before proposing a change:

1. Describe the business workflow or bug it addresses.
2. Keep changes focused and preserve the separation between screens, application services, domain rules, repository contracts, and platform adapters.
3. Put shared business rules in one domain function rather than copying them into screens or storage adapters.
4. Add or update unit and feature tests for changed behavior.
5. Run the tests, lint, and type check listed above.
6. For user-facing changes, describe the platforms and flows you manually checked, including any tooling you could not use.

By contributing, you agree that your contribution can be distributed under the project's MIT License.

## License

Bukora is available under the [MIT License](LICENSE). You may use, copy, modify, merge, publish, distribute, sublicense, and sell copies of the software, subject to the license's conditions, including retaining the copyright and permission notice. The software is provided without warranty, as described in the license.
