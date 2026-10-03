'use client'

import Link from 'next/link'

interface Props {
  activePage: 'planificador' | 'generar' | 'catalogos' | 'subir' | 'historial' | 'analisis'
  rightSlot?: React.ReactNode
}

const NAV = [
  { key: 'planificador', label: 'Planificador',        href: '/' },
  { key: 'generar',      label: 'Generar IA',          href: '/generar' },
  { key: 'catalogos',    label: 'Catálogos',           href: '/catalogos' },
  { key: 'subir',        label: 'Importar',            href: '/subir' },
  { key: 'historial',    label: 'Historial',           href: '/historial' },
  { key: 'analisis',     label: 'Análisis',            href: '/analisis' },
]

export default function AppHeader({ activePage, rightSlot }: Props) {
  const logout = async () => {
    await fetch('/api/auth', { method: 'DELETE' })
    window.location.href = '/login'
  }

  return (
    <header className="fixed top-0 w-full z-50" style={{ background: '#0F172A', borderBottom: '1px solid #334155', height: 64 }}>
      <div className="h-full w-full px-6 flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}>
            <span className="material-symbols-outlined text-white" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>
              restaurant_menu
            </span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 14 }}>
                Minuta Web
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider hidden sm:inline"
                style={{ background: '#1E293B', border: '1px solid #334155', color: '#94A3B8' }}>
                Faena
              </span>
            </div>
            <span className="text-[11px] hidden sm:block" style={{ color: '#64748B' }}>Casino de Faena</span>
          </div>
        </div>

        {/* Nav — solo 2xl */}
        <nav className="hidden 2xl:flex items-center gap-0.5 shrink-0 flex-1 justify-center">
          {NAV.map(l => (
            <Link key={l.key} href={l.href}
              className="px-3 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap"
              style={l.key === activePage
                ? { background: '#1E293B', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)', fontWeight: 600 }
                : { color: '#94A3B8' }}>
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Slot para botones específicos de la página */}
          {rightSlot}

          {/* Status dot */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
            style={{ background: '#0F172A', border: '1px solid #1E293B' }}>
            <div className="w-2 h-2 rounded-full shrink-0"
              style={{ background: '#10B981', boxShadow: '0 0 6px rgba(16,185,129,0.8)' }} />
            <span className="text-xs" style={{ color: '#64748B' }}>Live</span>
          </div>

          {/* Logout */}
          <button onClick={logout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
            style={{ background: '#1E293B', color: '#F87171', border: '1px solid #334155' }}
            title="Cerrar sesión">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span>
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>
    </header>
  )
}
