import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, SESSION_TTL_S, crearToken, passwordCorrecta } from '@/lib/session'

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({ password: null }))
  if (!passwordCorrecta(password)) {
    // Freno simple contra fuerza bruta: cada intento fallido cuesta ~1s
    await new Promise(r => setTimeout(r, 1000))
    return NextResponse.json({ ok: false, error: 'Contraseña incorrecta' }, { status: 401 })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, await crearToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TTL_S,
    path: '/',
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(SESSION_COOKIE)
  return res
}
