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
  fotoUrl?: string
  // Foto nueva (data URL) solo mientras se envía; el servidor la guarda en Drive y devuelve fotoUrl
  foto?: string
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

export interface ProveedorRec { id: string; nombre: string; activo: boolean }
export interface ProductoRec { id: string; nombre: string; unidad: string; frio: Frio; proveedor: string; activo: boolean }
export interface CatalogoRec { proveedores: ProveedorRec[]; productos: ProductoRec[] }

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

export function buscarProducto(cat: CatalogoRec | null, nombre: string, proveedor?: string): ProductoRec | undefined {
  if (!cat) return undefined
  const n = norm(nombre)
  const activos = cat.productos.filter(p => p.activo && norm(p.nombre) === n)
  return activos.find(p => proveedor && norm(p.proveedor) === norm(proveedor)) || activos[0]
}

function frioDe(txt: string): Frio | null {
  const t = norm(txt)
  if (t.startsWith('cong')) return 'congelado'
  if (t.startsWith('refr') || t.startsWith('fri')) return 'refrigerado'
  if (t.startsWith('amb') || t.startsWith('sec')) return 'ambiente'
  return null
}

// Lee un Excel con columnas Producto | Cantidad | Unidad | Tipo (opcional). Reconoce los encabezados por nombre.
export async function leerPedidoExcel(file: File, cat: CatalogoRec | null, proveedor?: string): Promise<{ items: ItemRecepcion[]; omitidas: number }> {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  const filas: (string | number)[][] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' })
  if (filas.length === 0) return { items: [], omitidas: 0 }
  const enc = filas[0].map(c => norm(String(c)))
  const idx = (...claves: string[]) => enc.findIndex(c => claves.some(k => c.includes(k)))
  const tieneEnc = idx('producto', 'articulo', 'item', 'descrip') >= 0
  const cP = tieneEnc ? idx('producto', 'articulo', 'item', 'descrip') : 0
  const cC = tieneEnc ? idx('cant') : 1
  const cU = tieneEnc ? idx('unid') : 2
  const cT = tieneEnc ? idx('tipo', 'frio', 'temp') : 3
  const items: ItemRecepcion[] = []
  let omitidas = 0
  for (const f of filas.slice(tieneEnc ? 1 : 0)) {
    const nombre = String(f[cP] ?? '').trim()
    if (!nombre) continue
    const cant = Number(String(f[cC] ?? '').replace(',', '.'))
    if (!isFinite(cant) || cant <= 0) { omitidas++; continue }
    const conocido = buscarProducto(cat, nombre, proveedor)
    const unidadTxt = cU >= 0 ? String(f[cU] ?? '').trim() : ''
    const frioTxt = cT >= 0 ? frioDe(String(f[cT] ?? '')) : null
    items.push({
      id: nuevoId(), producto: nombre, esperado: cant, recibido: null,
      unidad: unidadTxt || conocido?.unidad || 'un',
      frio: frioTxt || conocido?.frio || 'ambiente',
    })
  }
  return { items, omitidas }
}

export function descargarPlantillaPedido(): Promise<void> {
  return import('xlsx').then(XLSX => {
    const ws = XLSX.utils.aoa_to_sheet([['Producto', 'Cantidad', 'Unidad', 'Tipo'], ['Pollo trutro', 40, 'kg', 'refrigerado'], ['Arroz', 25, 'saco', 'ambiente'], ['Helado', 6, 'caja', 'congelado']])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Pedido')
    XLSX.writeFile(wb, 'plantilla_pedido.xlsx')
  })
}
