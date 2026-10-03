export const SESSION_COOKIE = 'minuta_session'
export const SESSION_TTL_S = 60 * 60 * 8

async function hmacHex(key: string, msg: string): Promise<string> {
  const enc = new TextEncoder()
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const buf = await crypto.subtle.sign('HMAC', k, enc.encode(msg))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function iguales(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// La clave deriva de ADMIN_PASSWORD: cambiar la contraseña invalida todas las sesiones abiertas.
function clave(): string {
  const pw = process.env.ADMIN_PASSWORD
  if (!pw) throw new Error('ADMIN_PASSWORD no configurada')
  return `minuta-session:${pw}`
}

export async function crearToken(): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_S
  return `${exp}.${await hmacHex(clave(), String(exp))}`
}

export async function tokenValido(token: string | undefined): Promise<boolean> {
  if (!token) return false
  const [expStr, sig] = token.split('.')
  const exp = Number(expStr)
  if (!sig || !Number.isFinite(exp) || exp < Date.now() / 1000) return false
  return iguales(sig, await hmacHex(clave(), expStr))
}

export function passwordCorrecta(intento: unknown): boolean {
  const pw = process.env.ADMIN_PASSWORD
  return typeof intento === 'string' && !!pw && iguales(intento, pw)
}
