import { BrowserWindow } from 'electron'
import http from 'http'

export function authenticate(authUrl) {
  return new Promise((resolve, reject) => {
    // open spotify login in a new window
    const authWindow = new BrowserWindow({ width: 500, height: 700 })
    authWindow.loadURL(authUrl)

    // start local server to catch the callback
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1:8888')
      const code = url.searchParams.get('code')

      if (code) {
        res.writeHead(200)
        res.end('Login successful! You can close this window.')
        server.close()
        authWindow.close()
        resolve(code)
      }
    }).listen(8888, '127.0.0.1')

    authWindow.on('closed', () => {
      server.close()
      reject('Window closed')
    })
  })
}