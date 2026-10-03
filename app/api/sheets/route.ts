import { NextRequest, NextResponse } from 'next/server'

const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL!
const SECRET = process.env.APPS_SCRIPT_SECRET!

const TIPOS_GET = new Set(['catalogos', 'turnos', 'minuta', 'historial'])

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

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams
    const tipo = params.get('tipo') || ''
    if (!TIPOS_GET.has(tipo)) return NextResponse.json({ ok: false, error: 'tipo no permitido' }, { status: 400 })
    const qs = new URLSearchParams({ tipo, ...await hmacToken() })
    const turno = params.get('turno')
    if (turno) qs.set('turno', turno)
    const res = await fetch(`${APPS_SCRIPT_URL}?${qs}`, { cache: 'no-store' })
    return NextResponse.json(await res.json())
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
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
