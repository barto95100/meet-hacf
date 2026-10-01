/**
 * Minimal parser for the Prometheus text exposition format. Returns a flat
 * list of { name, labels, value }; comment lines (# HELP / # TYPE) are skipped.
 */
export const parsePrometheus = (text) => {
  const samples = []
  for (const line of text.split('\n')) {
    if (!line || line[0] === '#') continue
    const braceStart = line.indexOf('{')
    let name
    let labels = {}
    let rest
    if (braceStart === -1) {
      const space = line.indexOf(' ')
      if (space === -1) continue
      name = line.slice(0, space)
      rest = line.slice(space + 1)
    } else {
      name = line.slice(0, braceStart)
      const braceEnd = line.indexOf('}', braceStart)
      if (braceEnd === -1) continue
      labels = parseLabels(line.slice(braceStart + 1, braceEnd))
      rest = line.slice(braceEnd + 1).trim()
    }
    const value = Number.parseFloat(rest)
    if (Number.isFinite(value)) samples.push({ name, labels, value })
  }
  return samples
}

const parseLabels = (text) => {
  const labels = {}
  const re = /([a-zA-Z_][\w]*)="((?:[^"\\]|\\.)*)"/g
  let match
  while ((match = re.exec(text))) {
    labels[match[1]] = match[2].replace(/\\(["\\n])/g, (_, c) => (c === 'n' ? '\n' : c))
  }
  return labels
}

/** Sum the values of every sample named `name` (optionally matching `labels`). */
export const sumBy = (samples, name, labels = {}) =>
  samples.reduce((total, sample) => {
    if (sample.name !== name) return total
    for (const [key, value] of Object.entries(labels)) {
      if (sample.labels[key] !== value) return total
    }
    return total + sample.value
  }, 0)

/** True when at least one sample named `name` is present. */
export const has = (samples, name) => samples.some((sample) => sample.name === name)
