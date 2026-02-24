# pomodoro-tunes

An Electron Pomodoro Study application with Spotify music feature

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

1. Create a `.env` file at `src/main/.env` (create the file if the folder exists).
2. Add your Spotify app credentials (from the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)):
   - `SPOTIFY_CLIENT_ID=your_client_id`
   - `SPOTIFY_CLIENT_SECRET=your_client_secret`

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```
