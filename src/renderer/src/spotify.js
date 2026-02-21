const SCOPES = [
  'streaming',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing'
].join(' ')

export function getAuthUrl() {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
  })
  return `https://accounts.spotify.com/authorize?${params}`
}

export async function getToken(code) {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    })
  })
  const data = await response.json()
  return data.access_token
}

export async function getCurrentTrack(token) {
  const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (response.status === 204) return null
  return await response.json()
}

export async function controlPlayback(token, action) {
  const actions = {
    play: { method: 'PUT', url: 'https://api.spotify.com/v1/me/player/play' },
    pause: { method: 'PUT', url: 'https://api.spotify.com/v1/me/player/pause' },
    next: { method: 'POST', url: 'https://api.spotify.com/v1/me/player/next' },
    previous: { method: 'POST', url: 'https://api.spotify.com/v1/me/player/previous' },
  }
  const { method, url } = actions[action]
  await fetch(url, {
    method,
    headers: { 'Authorization': `Bearer ${token}` }
  })
}

export async function setVolume(token, volume) {
  await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${volume}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` }
  })
}