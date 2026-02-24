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