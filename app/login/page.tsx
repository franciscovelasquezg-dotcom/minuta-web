'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        router.push('/')
        router.refresh()
      } else {
        const data = await res.json()
        setError(data.error || 'Contraseña incorrecta')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      <div
        className="min-h-screen flex items-center justify-center relative overflow-hidden px-4"
        style={{ background: '#0B0F19', fontFamily: 'Manrope, sans-serif', color: '#F1F5F9' }}
      >
        {/* Blobs de fondo */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -left-20 w-96 h-96 rounded-full" style={{ background: 'rgba(16,185,129,0.10)', filter: 'blur(128px)' }} />
          <div className="absolute -bottom-24 -right-16 rounded-full" style={{ width: '30rem', height: '30rem', background: 'rgba(6,78,59,0.30)', filter: 'blur(140px)' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ width: '40rem', height: '40rem', background: 'rgba(15,23,42,0.40)', filter: 'blur(100px)' }} />
        </div>

        <main className="w-full max-w-md relative z-10">
          <div
            className="rounded-2xl overflow-hidden p-7 flex flex-col gap-6"
            style={{
              background: 'rgba(30,41,59,0.90)',
              backdropFilter: 'blur(24px)',
              border: '1px solid #334155',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.60)',
            }}
          >
            {/* Header */}
            <div className="flex flex-col items-center text-center gap-2">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-1"
                style={{ background: '#0F172A', border: '1px solid #334155', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.40)' }}
              >
                🍽
              </div>
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase"
                style={{ background: 'rgba(15,23,42,0.80)', border: '1px solid #334155', color: '#94A3B8' }}
              >
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#10B981', boxShadow: '0 0 6px #10B981' }} />
                Casino Central Spence · BHP Group
              </div>
              <h1 className="text-2xl font-bold tracking-tight mt-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#F1F5F9' }}>
                Minuta Web
              </h1>
              <p className="text-sm" style={{ color: '#94A3B8' }}>
                Portal de Gestión y Planificación de Casino de Faena
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Contraseña */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold tracking-wide" style={{ color: '#F1F5F9' }}>
                  Contraseña de Administrador
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 pointer-events-none text-lg" style={{ color: '#94A3B8' }}>lock</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoFocus
                    required
                    className="w-full h-11 pl-10 pr-10 text-sm rounded-xl transition-all duration-200 focus:outline-none tracking-wider"
                    style={{
                      background: '#0F172A',
                      border: '1px solid #334155',
                      color: '#F1F5F9',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.boxShadow = '0 0 0 1px #10B981' }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.boxShadow = 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-2.5 p-1 rounded-lg transition-colors"
                    style={{ color: '#94A3B8' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(51,65,85,0.5)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                <p className="text-xs leading-relaxed mt-0.5" style={{ color: '#64748B' }}>
                  Ingresa la credencial maestra de casino para acceder al panel operacional.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm" style={{ background: '#ffdad6', color: '#93000a', border: '1px solid #f8b4b4' }}>
                  <span className="material-symbols-outlined text-base">warning</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !password}
                className="w-full h-11 mt-2 font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
                style={{
                  background: loading ? '#059669' : '#10B981',
                  color: '#022c22',
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  boxShadow: '0 10px 15px -3px rgba(5,150,105,0.30)',
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#059669' }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#10B981' }}
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                    <span>Verificando Turno...</span>
                  </>
                ) : (
                  <>
                    <span>Acceder al Sistema</span>
                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="flex flex-col items-center gap-2 pt-1 text-center" style={{ borderTop: '1px solid rgba(51,65,85,0.40)' }}>
              <div className="inline-flex items-center gap-1.5 pt-2 text-xs font-semibold" style={{ color: '#10B981', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                <span>Conexión cifrada de alta seguridad</span>
              </div>
              <p className="text-xs max-w-xs leading-normal" style={{ color: '#64748B' }}>
                Conectado de forma segura a Google Sheets Database · Minuta v1.0
              </p>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
