import http from 'node:http'
import https from 'node:https'

/**
 * Minimal GET helper. Unlike fetch(), it lets us set the Host header, which is
 * needed to reach the Meet backend on its internal address while presenting
 * the public host name.
 */
export const httpGet = (url, { headers = {}, maxBytes = 5 * 1024 * 1024, timeoutMs = 8000 } = {}) =>
  new Promise((resolve, reject) => {
    const target = new URL(url)
    const client = target.protocol === 'https:' ? https : http
    const req = client.request(
      target,
      { method: 'GET', headers, timeout: timeoutMs },
      (res) => {
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
