export function hashSeed(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function seededRandom(seed: string) {
  let value = hashSeed(seed)
  return () => {
    value += 0x6d2b79f5
    let next = Math.imul(value ^ (value >>> 15), 1 | value)
    next ^= next + Math.imul(next ^ (next >>> 7), 61 | next)
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296
  }
}

function hexChunk(input: string, length: number) {
  const characters = "0123456789abcdef"
  let output = ""
  for (let index = 0; index < length; index += 1) {
    output += characters[input.charCodeAt(index % input.length) % characters.length]
  }
  return output
}

export function deterministicUuid(seed: string) {
  const hashed = `${hashSeed(seed).toString(16)}${hashSeed(`${seed}:salt`).toString(16)}${hashSeed(`${seed}:v`).toString(16)}`
  const base = hexChunk(hashed, 32)
  const chars = base.split("")
  chars[12] = "4"
  const variant = Number.parseInt(chars[16], 16)
  chars[16] = ((variant & 0x3) | 0x8).toString(16)
  return `${chars.slice(0, 8).join("")}-${chars.slice(8, 12).join("")}-${chars.slice(12, 16).join("")}-${chars
    .slice(16, 20)
    .join("")}-${chars.slice(20, 32).join("")}`
}

export function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function atOffset(referenceUtc: string, minutesAgo: number) {
  return new Date(Date.parse(referenceUtc) - minutesAgo * 60 * 1000).toISOString()
}

export function toJwt(payload: Record<string, unknown>) {
  const header = { alg: "none", typ: "JWT" }
  const encode = (input: Record<string, unknown>) => {
    const text = JSON.stringify(input)
    if (typeof window !== "undefined" && typeof window.btoa === "function") {
      const ascii = encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, (_match, hex: string) =>
        String.fromCharCode(Number.parseInt(hex, 16)),
      )
      return window
        .btoa(ascii)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "")
    }

    return Buffer.from(text).toString("base64url")
  }

  return `${encode(header)}.${encode(payload)}.`
}
