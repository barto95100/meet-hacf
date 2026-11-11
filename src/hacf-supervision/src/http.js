import http from 'node:http'
import https from 'node:https'

/**
 * Minimal GET helper. Unlike fetch(), it lets us set the Host header, which is
 * needed to reach the Meet backend on its internal address while presenting
 * the public host name.
 */
export const httpGet = (url, { headers = {}, maxBytes = 5 * 1024 * 1024, timeoutMs = 8000, maxRedirects = 0 } = {}) =>
  new Promise((resolve, reject) => {
    const target = new URL(url)
    const client = target.protocol === 'https:' ? https : http
    const req = client.request(
      target,
      { method: 'GET', headers, timeout: timeoutMs },
      (res) => {
        // Follow a bounded number of redirects (used for avatar URLs: Discourse
        // serves /user_avatar/ as a 30x to the stored file, sometimes twice).
        const location = res.headers.location
        if (res.statusCode >= 300 && res.statusCode < 400 && location && maxRedirects > 0) {
          res.resume() // drain the body so the socket can be reused
          let next
          try {
            next = new URL(location, target)
          } catch {
            reject(new Error(`Invalid redirect from ${target.host}`))
            return
          }
          if (next.protocol !== 'https:' && next.protocol !== 'http:') {
            reject(new Error(`Refusing non-HTTP redirect from ${target.host}`))
            return
          }
          resolve(httpGet(next.href, { headers, maxBytes, timeoutMs, maxRedirects: maxRedirects - 1 }))
          return
        }
        const chunks = []
        let size = 0
        res.on('data', (chunk) => {
          size += chunk.length
          if (size > maxBytes) {
            req.destroy(new Error(`Response too large from ${target.host}`))
            return
          }
          chunks.push(chunk)
        })
        res.on('end', () =>
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks),
          })
        )
        res.on('error', reject)
      }
    )
    req.on('timeout', () => req.destroy(new Error(`Timeout calling ${target.host}`)))
    req.on('error', reject)
    req.end()
  })

export const getJson = async (url, options) => {
  const res = await httpGet(url, options)
  let data = null
  if (res.body.length && String(res.headers['content-type']).includes('json')) {
    data = JSON.parse(res.body.toString('utf8'))
  }
  return { status: res.status, data }
}
