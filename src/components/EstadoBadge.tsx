import { Estado } from '@/types/minuta'

const colores: Record<Estado, string> = {
  Confirmado: 'bg-green-100 text-green-800',
  'Por Confirmar': 'bg-yellow-100 text-yellow-800',
  'En Revisión': 'bg-orange-100 text-orange-800',
}

export default function EstadoBadge({ estado }: { estado: Estado }) {
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${colores[estado]}`}>
      {estado}
    </span>
  )
}
