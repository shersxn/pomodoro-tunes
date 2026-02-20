import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  spotifyAuth:         (authUrl) => ipcRenderer.invoke('spotify-auth', authUrl),
  spotifyGetToken:     (code)    => ipcRenderer.invoke('spotify-get-token', { code }),
  spotifyControl:      (action, token) => ipcRenderer.invoke('spotify-control', { action, token }),
  spotifyVolume:       (token, volume) => ipcRenderer.invoke('spotify-volume', { token, volume }),
  spotifyCurrentTrack: (token)   => ipcRenderer.invoke('spotify-current-track', { token }),
  spotifyDevices:      (token)   => ipcRenderer.invoke('spotify-devices', { token }),
  spotifyGetImage: (url) => ipcRenderer.invoke('spotify-get-image', { url }),
})