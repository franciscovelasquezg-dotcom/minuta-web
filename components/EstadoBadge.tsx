import { Estado } from '@/types/minuta'

const colores: Record<Estado, string> = {
  Confirmado:     'bg-emerald-950/80 border border-emerald-600/40 text-emerald-300',
  'Por Confirmar': 'bg-amber-950/70 border border-amber-600/40 text-amber-300',
  'En Revisión':   'bg-sky-950/80 border border-sky-600/40 text-sky-300',
}

export default function EstadoBadge({ estado }: { estado: Estado }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${colores[estado]}`}>
      {estado}
    </span>
  )
}
