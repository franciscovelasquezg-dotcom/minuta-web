import { NextRequest, NextResponse } from 'next/server'

const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL!
const SECRET = process.env.APPS_SCRIPT_SECRET!

async function hmacToken(): Promise<{ t: string; sig: string }> {
  const t = String(Math.floor(Date.now() / 1000))
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const buf = await crypto.subtle.sign('HMAC', key, enc.encode(t))
  const sig = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
  return { t, sig }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const token = await hmacToken()
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({ ...body, ...token }),
    })
    const json = await res.json()
    return NextResponse.json(json)
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
