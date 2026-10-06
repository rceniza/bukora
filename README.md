# Bukora

Offline booking ledger for Cenere Beach House, built with Expo and React Native for iOS and Android.

## Run locally

```sh
npm install
npm run start
```

## Docker web preview

```sh
docker compose up --build
```

Open `http://localhost:8081`. Docker is for development and web preview; the native app does not depend on a server or network connection.

## Quality checks

```sh
npm test -- --runInBand
npm run lint
npm run typecheck
```
