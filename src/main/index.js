import dotenv from 'dotenv'
import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(process.cwd(), 'src', 'main', '.env')
dotenv.config({ path: envPath })
import { authenticate } from './auth'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET
const REDIRECT_URI='http://127.0.0.1:8888/callback'

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 500,
    height: 500,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // ── Spotify auth ──────────────────────────────────────────────────────
  const SCOPES = ['streaming', 'user-read-playback-state', 'user-modify-playback-state', 'user-read-currently-playing'].join(' ')
  ipcMain.handle('spotify-get-auth-url', () => {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      scope: SCOPES,
    })
    return `https://accounts.spotify.com/authorize?${params}`
  })
  ipcMain.handle('spotify-auth', async (_, authUrl) => {
    const code = await authenticate(authUrl)
    return code
  })

  ipcMain.handle('spotify-get-token', async (_, { code }) => {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }).toString()
    })
    const data = await response.json()
    return data.access_token
  })

  // ── Spotify playback ──────────────────────────────────────────────────
  ipcMain.handle('spotify-control', async (_, { action, token }) => {
    const actions = {
      play:     { method: 'PUT',  url: 'https://api.spotify.com/v1/me/player/play' },
      pause:    { method: 'PUT',  url: 'https://api.spotify.com/v1/me/player/pause' },
      next:     { method: 'POST', url: 'https://api.spotify.com/v1/me/player/next' },
      previous: { method: 'POST', url: 'https://api.spotify.com/v1/me/player/previous' },
    }
    const { method, url } = actions[action]
    await fetch(url, {
      method,
      headers: { 'Authorization': `Bearer ${token}` }
    })
  })

  ipcMain.handle('spotify-volume', async (_, { token, volume }) => {
    await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${volume}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    })
  })

  ipcMain.handle('spotify-current-track', async (_, { token }) => {
    const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (response.status === 204) return null
    return await response.json()
  })

  ipcMain.handle('spotify-devices', async (_, { token }) => {
    const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    return await response.json()
  })

  // ── Album art fetcher ─────────────────────────────────────────────────
  ipcMain.handle('spotify-get-image', async (_, { url }) => {
    const response = await fetch(url)
    const buffer = await response.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const mimeType = response.headers.get('content-type') || 'image/jpeg'
    return `data:${mimeType};base64,${base64}`
  })

  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})