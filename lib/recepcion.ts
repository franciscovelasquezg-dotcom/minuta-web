// Recepción de camión: tipos y reglas (sin llamadas a red)

export type Frio = 'ambiente' | 'refrigerado' | 'congelado'

export interface ItemRecepcion {
  id: string
  producto: string
  unidad: string
  esperado: number
  recibido: number | null
  frio: Frio
  nota?: string
}

export interface TempRecepcion {
  id: string
  etiqueta: string
  categoria: 'refrigerado' | 'congelado'
  valor: number
  hora: string
}

export interface Recepcion {
  id: string
  fecha: string
  hora: string
  proveedor: string
  guia: string
  estado: 'abierta' | 'cerrada'
  responsable: string
  fotoUrl: string
  items: ItemRecepcion[]
  temps: TempRecepcion[]
  obs: string
  actualizado: number
}

export const UNIDADES = ['kg', 'un', 'caja', 'bandeja', 'bolsa', 'lt', 'saco']

// Rangos acordados: refrigerado 0 a 5 °C, congelado -18 °C o menos
export const RANGO = {
  refrigerado: { min: 0, max: 5, texto: '0 a 5 °C' },
  congelado: { min: -Infinity, max: -18, texto: '-18 °C o menos' },
} as const

export function tempOk(categoria: TempRecepcion['categoria'], valor: number): boolean {
  const r = RANGO[categoria]
  return valor >= r.min && valor <= r.max
}

export type EstadoItem = 'sin_contar' | 'ok' | 'falta' | 'sobra'

export function estadoItem(i: ItemRecepcion): EstadoItem {
  if (i.recibido === null) return 'sin_contar'
  if (i.recibido === i.esperado) return 'ok'
  return i.recibido < i.esperado ? 'falta' : 'sobra'
}

export function diferencia(i: ItemRecepcion): number {
  return i.recibido === null ? 0 : Math.round((i.recibido - i.esperado) * 1000) / 1000
}

export interface ResumenRecepcion {
  total: number
  sinContar: number
  faltas: number
  sobras: number
  tempsFuera: number
  // Productos fríos sin ninguna temperatura registrada
  fríosSinTemp: number
}

export function resumir(r: Pick<Recepcion, 'items' | 'temps'>): ResumenRecepcion {
  const est = r.items.map(estadoItem)
  const frios = r.items.filter(i => i.frio !== 'ambiente')
  return {
    total: r.items.length,
    sinContar: est.filter(e => e === 'sin_contar').length,
    faltas: est.filter(e => e === 'falta').length,
    sobras: est.filter(e => e === 'sobra').length,
    tempsFuera: r.temps.filter(t => !tempOk(t.categoria, t.valor)).length,
    fríosSinTemp: frios.filter(i => !r.temps.some(t => t.id === i.id)).length,
  }
}

export function nuevoId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export function hoyISO(): string {
  return new Date().toLocaleDateString('sv-SE')
}

export function horaAhora(): string {
  return new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function recepcionNueva(): Recepcion {
  return {
    id: nuevoId(), fecha: hoyISO(), hora: horaAhora(), proveedor: '', guia: '', estado: 'abierta',
    responsable: '', fotoUrl: '', items: [], temps: [], obs: '', actualizado: 0,
  }
}

// Reduce la foto a ~1000 px JPEG para que suba rápido con mala señal
export function comprimirFoto(file: File, maxLado = 1000, calidad = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const esc = Math.min(1, maxLado / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * esc)
      c.height = Math.round(img.height * esc)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', calidad))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la foto')) }
    img.src = url
  })
}
