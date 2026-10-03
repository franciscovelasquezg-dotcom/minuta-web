'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import AppHeader from '@/components/AppHeader'

async function extraerTextoDocx(file: File): Promise<string> {
  const mammoth = await import('mammoth')
  const ab = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer: ab })
  return result.value
}

function parsearTextoLibre(texto: string, archivo: string): DiaParsed[] {
  const DIAS_SEMANA = ['lunes','martes','miércoles','miercoles','jueves','viernes','sábado','sabado','domingo']
  const lines = texto.split('\n').map(l => l.trim()).filter(Boolean)
  const dias: DiaParsed[] = []
  let diaActual: DiaParsed | null = null
  let servicioActual: ServicioParsed | null = null
  let diaNum = 0

  const pushServicio = () => {
    if (diaActual && servicioActual) { diaActual.servicios.push(servicioActual); servicioActual = null }
  }

  for (const line of lines) {
    const lower = line.toLowerCase()
    const nombreDiaEncontrado = DIAS_SEMANA.find(d => lower.startsWith(d) || lower.includes(' ' + d + ' ') || lower.includes(' ' + d) || lower.includes(d))
    const fechaMatch = line.match(/\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?/)
    const diaNumMatch = lower.match(/^d[ií]a\s*(\d+)/i)
    // Heurística relajada: basta con nombre de día, "Día N", o una fecha sola al inicio de línea para abrir un nuevo día
    const pareceInicioDia = !!nombreDiaEncontrado || !!diaNumMatch || (!!fechaMatch && line.trim().length < 25 && fechaMatch.index === 0)
    if (pareceInicioDia) {
      pushServicio()
      if (diaActual) dias.push(diaActual)
      diaNum++
      diaActual = {
        dia: diaNumMatch ? parseInt(diaNumMatch[1]) : diaNum,
        fecha: fechaMatch ? fechaMatch[0] : '',
        diaSemana: nombreDiaEncontrado ? nombreDiaEncontrado.charAt(0).toUpperCase() + nombreDiaEncontrado.slice(1) : '',
        servicios: [],
      }
      continue
    }
    if (/almuerzo/i.test(line)) { pushServicio(); servicioActual = { tipo: 'Almuerzo', platoPrincipal: '', ensalada: '', acompañamiento: '', estado: 'Por Confirmar' }; continue }
    if (/\bcena\b/i.test(line)) { pushServicio(); servicioActual = { tipo: 'Cena', platoPrincipal: '', ensalada: '', acompañamiento: '', estado: 'Por Confirmar' }; continue }
    if (!servicioActual) {
      // Ya se abrió un día (fecha/día de semana/"Día N") pero aún no hay marcador Almuerzo/Cena: asume Almuerzo implícito
      if (diaActual && diaActual.servicios.length === 0 && line.length > 3 && line.length < 80) {
        servicioActual = { tipo: 'Almuerzo', platoPrincipal: '', ensalada: '', acompañamiento: '', estado: 'Por Confirmar' }
      } else continue
    }
    if (/plato\s*principal|proteína|proteina/i.test(line)) { const v = line.replace(/.*:\s*/, '').trim(); if (v) servicioActual!.platoPrincipal = v }
    else if (/acompañ|acompan/i.test(line)) { const v = line.replace(/.*:\s*/, '').trim(); if (v) servicioActual!.acompañamiento = v }
    else if (/ensalada/i.test(line)) { const v = line.replace(/.*:\s*/, '').trim(); if (v) servicioActual!.ensalada = v }
    else if (/postre/i.test(line)) { const v = line.replace(/.*:\s*/, '').trim(); if (v) servicioActual!.postre = v }
    else if (!servicioActual!.platoPrincipal && line.length > 3 && line.length < 60) { servicioActual!.platoPrincipal = line }
    else if (!servicioActual!.acompañamiento && line.length > 3 && line.length < 60) { servicioActual!.acompañamiento = line }
    else if (!servicioActual!.ensalada && line.length > 3 && line.length < 60) { servicioActual!.ensalada = line }
  }
  pushServicio()
  if (diaActual && diaActual.servicios.length > 0) dias.push(diaActual)
  void archivo
  return dias
}

interface ServicioParsed { tipo: string; ensalada: string; acompañamiento: string; platoPrincipal: string; postre?: string; estado: string }
interface DiaParsed { dia: number; fecha: string; diaSemana: string; servicios: ServicioParsed[] }

const PROTEINAS: { tipo: string; keywords: string[] }[] = [
  { tipo: 'Vacuno',      keywords: ['vacuno','carne','asado','estofado','mechada','albóndiga','albondiga','bistec','lomo','osobuco','cazuela de vac','plateada','malaya'] },
  { tipo: 'Cerdo',       keywords: ['cerdo','chuleta','medalla','costilla','pernil','tocino'] },
  { tipo: 'Pollo',       keywords: ['pollo','gallina','pavo'] },
  { tipo: 'Pescado',     keywords: ['pescado','merluza','salmón','salmon','atún','atun','congrio','reineta','jurel','sardina','camaron','camarón','marisco'] },
  { tipo: 'Pasta',       keywords: ['spaghetti','mostaccioli','espirales','fettuccine','pasta','tallarín','tallarin','lasaña','lasana','macarrón','macarron'] },
  { tipo: 'Legumbre',    keywords: ['lentejas','porotos','garbanzos','arvejas','habas','legumbre'] },
  { tipo: 'Vegetariano', keywords: ['vegetariano','vegano','tofu','berenjena rellena','zapallo relleno'] },
]

function clasificarProteina(nombre: string): string {
  const n = nombre.toLowerCase()
  for (const p of PROTEINAS) { if (p.keywords.some(k => n.includes(k))) return p.tipo }
  return 'Otro'
}

function extraerBase(nombre: string): string {
  const proteina = clasificarProteina(nombre)
  return proteina !== 'Otro' ? proteina : nombre.split(' ').slice(0, 2).join(' ')
}

interface AlertaPlato { nombre: string; proteina: string; veces: number; dias: number[]; gapMin: number; gapRecomendado: number; nivel: 'ok' | 'cercano' | 'repetido' }
interface AlertaProteina { tipo: string; veces: number; diasConsecutivos: number[][]; pct: number }
interface AlertaEnsalada { nombre: string; veces: number; dias: number[]; nivel: 'ok' | 'repetida' }
interface GrupoBase { base: string; platos: string[]; vecesTotal: number; dias: number[] }
interface Informe {
  archivo: string; totalDias: number; totalServicios: number; confirmados: number; gapRecomendado: number; score: number
  alertasPlato: AlertaPlato[]; alertasProteina: AlertaProteina[]; alertasEnsalada: AlertaEnsalada[]
  gruposBase: GrupoBase[]; acompsTop: { nombre: string; veces: number }[]
  distribucionProteina: { tipo: string; veces: number; pct: number }[]
  semanas: { num: number; dias: DiaParsed[] }[]
}

function calcGapMin(p: number[]): number { if (p.length < 2) return 999; let m = 999; for (let i = 1; i < p.length; i++) m = Math.min(m, p[i] - p[i-1]); return m }

function generarInforme(dias: DiaParsed[], archivo: string): Informe {
  const totalDias = dias.length
  const totalServicios = dias.reduce((a, d) => a + d.servicios.length, 0)
  const confirmados = dias.reduce((a, d) => a + d.servicios.filter(s => s.estado === 'Confirmado').length, 0)
  const mapaPlatos = new Map<string, { dias: number[]; proteina: string }>()
  const mapaEnsaladas = new Map<string, number[]>()
  const mapaAcomps = new Map<string, number>()
  const mapaProteina = new Map<string, number[]>()
  const mapaBase = new Map<string, { platos: Set<string>; dias: number[] }>()

  dias.forEach((dia, di) => {
    dia.servicios.forEach(svc => {
      const plato = svc.platoPrincipal?.trim(); const ensalada = svc.ensalada?.trim(); const acomp = svc.acompañamiento?.trim()
      if (!plato || plato === 'Por Definir') return
      const proteina = clasificarProteina(plato); const base = extraerBase(plato)
      const ep = mapaPlatos.get(plato) || { dias: [], proteina }; ep.dias.push(di + 1); mapaPlatos.set(plato, ep)
      const eprot = mapaProteina.get(proteina) || []; eprot.push(di + 1); mapaProteina.set(proteina, eprot)
      const eb = mapaBase.get(base) || { platos: new Set(), dias: [] }; eb.platos.add(plato); eb.dias.push(di + 1); mapaBase.set(base, eb)
      if (ensalada && ensalada !== 'Por Definir') { const ee = mapaEnsaladas.get(ensalada) || []; ee.push(di + 1); mapaEnsaladas.set(ensalada, ee) }
      if (acomp && acomp !== 'Por Definir') mapaAcomps.set(acomp, (mapaAcomps.get(acomp) || 0) + 1)
    })
  })

  const gapRecomendado = Math.min(7, Math.max(3, Math.floor(totalDias / Math.max(1, mapaPlatos.size))))
  const alertasPlato: AlertaPlato[] = Array.from(mapaPlatos.entries()).map(([nombre, d]) => {
    const gapMin = calcGapMin(d.dias)
    const nivel: AlertaPlato['nivel'] = d.dias.length === 1 ? 'ok' : gapMin < gapRecomendado ? 'repetido' : gapMin < gapRecomendado + 2 ? 'cercano' : 'ok'
    return { nombre, proteina: d.proteina, veces: d.dias.length, dias: d.dias, gapMin: gapMin === 999 ? 0 : gapMin, gapRecomendado, nivel }
  }).sort((a, b) => ({ repetido: 0, cercano: 1, ok: 2 }[a.nivel] - { repetido: 0, cercano: 1, ok: 2 }[b.nivel] || b.veces - a.veces))

  const alertasProteina: AlertaProteina[] = Array.from(mapaProteina.entries()).map(([tipo, diasList]) => {
    const unique = [...new Set(diasList)].sort((a, b) => a - b)
    const rachas: number[][] = []; let racha: number[] = [unique[0]]
    for (let i = 1; i < unique.length; i++) { if (unique[i] - unique[i-1] <= 1) racha.push(unique[i]); else { if (racha.length >= 2) rachas.push([...racha]); racha = [unique[i]] } }
    if (racha.length >= 2) rachas.push(racha)
    return { tipo, veces: diasList.length, diasConsecutivos: rachas, pct: Math.round((diasList.length / totalServicios) * 100) }
  }).sort((a, b) => b.veces - a.veces)

  const gruposBase: GrupoBase[] = Array.from(mapaBase.entries()).filter(([, v]) => v.platos.size >= 2)
    .map(([base, v]) => ({ base, platos: Array.from(v.platos), vecesTotal: v.dias.length, dias: [...new Set(v.dias)].sort((a, b) => a - b) }))
    .sort((a, b) => b.platos.length - a.platos.length)

  const alertasEnsalada: AlertaEnsalada[] = Array.from(mapaEnsaladas.entries())
    .map(([nombre, diasList]) => ({ nombre, veces: diasList.length, dias: diasList, nivel: (diasList.length > 1 ? 'repetida' : 'ok') as AlertaEnsalada['nivel'] }))
    .sort((a, b) => b.veces - a.veces)

  const acompsTop = Array.from(mapaAcomps.entries()).map(([nombre, veces]) => ({ nombre, veces })).sort((a, b) => b.veces - a.veces).slice(0, 10)
  const distribucionProteina = Array.from(mapaProteina.entries()).map(([tipo, d]) => ({ tipo, veces: d.length, pct: Math.round(d.length / totalServicios * 100) })).sort((a, b) => b.veces - a.veces)
  const semanas = []; for (let i = 0; i < totalDias; i += 7) semanas.push({ num: Math.floor(i / 7) + 1, dias: dias.slice(i, i + 7) })

  let score = 100
  score -= alertasPlato.filter(a => a.nivel === 'repetido').length * 8
  score -= alertasPlato.filter(a => a.nivel === 'cercano').length * 3
  score -= alertasEnsalada.filter(a => a.nivel === 'repetida').length * 2
  score -= alertasProteina.reduce((a, p) => a + p.diasConsecutivos.length, 0) * 5
  score = Math.max(0, Math.min(100, score))

  return { archivo, totalDias, totalServicios, confirmados, gapRecomendado, score, alertasPlato, alertasProteina, alertasEnsalada, gruposBase, acompsTop, distribucionProteina, semanas }
}

function parsearExcel(file: File): Promise<DiaParsed[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const hojaMinuta = wb.SheetNames.find(n => n.toLowerCase().includes('minuta') || n.toLowerCase().includes('días') || n.toLowerCase().includes('dias')) || wb.SheetNames[0]
        const ws = wb.Sheets[hojaMinuta]
        const rows: (string | number)[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
        const dias: DiaParsed[] = []; let diaActual: DiaParsed | null = null
        for (const row of rows) {
          const cols = row.map(c => String(c || '').trim()); const [c0, c1, c2, c3, c4, c5, c6] = cols
          const numDia = parseInt(c0)
          if (!isNaN(numDia) && numDia > 0 && numDia <= 31) {
            diaActual = { dia: numDia, fecha: c1, diaSemana: c2, servicios: [] }; dias.push(diaActual)
            if (c3) diaActual.servicios.push({ tipo: c3, ensalada: c4, acompañamiento: c5, platoPrincipal: c6, estado: String(row[7] || '').trim() || 'Por Confirmar' })
          } else if (diaActual && (c3 === 'Almuerzo' || c3 === 'Cena')) {
            diaActual.servicios.push({ tipo: c3, ensalada: c4, acompañamiento: c5, platoPrincipal: c6, estado: String(row[7] || '').trim() || 'Por Confirmar' })
          }
        }
        resolve(dias.filter(d => d.servicios.length > 0))
      } catch (err) { reject(err) }
    }
    reader.onerror = reject; reader.readAsArrayBuffer(file)
  })
}

const PROT_BADGE: Record<string, string> = {
  Vacuno:      'bg-red-950/80 border border-red-800/60 text-red-400',
  Cerdo:       'bg-rose-950/80 border border-rose-800/60 text-rose-300',
  Pollo:       'bg-amber-950/80 border border-amber-700/60 text-amber-300',
  Pescado:     'bg-sky-950/80 border border-sky-700/60 text-sky-300',
  Pasta:       'bg-orange-950/80 border border-orange-700/60 text-orange-300',
  Legumbre:    'bg-emerald-950/80 border border-emerald-700/60 text-emerald-300',
  Vegetariano: 'bg-emerald-950/80 border border-emerald-700/60 text-emerald-300',
  Otro:        'bg-slate-800/80 border border-slate-600/60 text-slate-300',
}

const dkInput = 'w-full bg-[#0F172A] border border-[#334155] text-slate-200 rounded-lg p-1.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500'

interface PasoProgreso { label: string; pct: number }

const PASOS_EXCEL: PasoProgreso[] = [
  { label: 'Leyendo archivo', pct: 20 },
  { label: 'Interpretando hojas y columnas', pct: 60 },
  { label: 'Generando informe de variedad', pct: 90 },
]
const PASOS_DOCX: PasoProgreso[] = [
  { label: 'Leyendo archivo', pct: 20 },
  { label: 'Extrayendo texto del documento', pct: 50 },
  { label: 'Detectando días y servicios', pct: 75 },
  { label: 'Generando informe de variedad', pct: 90 },
]
const PASOS_PDF: PasoProgreso[] = [
  { label: 'Leyendo archivo', pct: 10 },
  { label: 'Abriendo páginas PDF', pct: 25 },
  { label: 'Extrayendo texto', pct: 40 },
  { label: 'Detectando días y servicios', pct: 75 },
  { label: 'Generando informe de variedad', pct: 90 },
]
const PASOS_PDF_OCR: PasoProgreso[] = [
  { label: 'Leyendo archivo', pct: 8 },
  { label: 'Abriendo páginas PDF', pct: 15 },
  { label: 'Sin texto digital — convirtiendo a imagen', pct: 22 },
  { label: 'Reconociendo texto con OCR (puede tardar)', pct: 70 },
  { label: 'Detectando días y servicios', pct: 85 },
  { label: 'Generando informe de variedad', pct: 92 },
]
const PASOS_IMG: PasoProgreso[] = [
  { label: 'Leyendo foto', pct: 10 },
  { label: 'Reconociendo texto con OCR (puede tardar)', pct: 70 },
  { label: 'Detectando días y servicios', pct: 85 },
  { label: 'Generando informe de variedad', pct: 92 },
]

async function archivoACanvas(file: File): Promise<HTMLCanvasElement> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new window.Image()
    el.onload = () => resolve(el)
    el.onerror = reject
    el.src = URL.createObjectURL(file)
  })
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  canvas.getContext('2d')!.drawImage(img, 0, 0)
  URL.revokeObjectURL(img.src)
  return canvas
}

function rotarCanvas(src: HTMLCanvasElement, grados: 90 | 180 | 270): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  const girado90 = grados === 90 || grados === 270
  canvas.width = girado90 ? src.height : src.width
  canvas.height = girado90 ? src.width : src.height
  const ctx = canvas.getContext('2d')!
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate(grados * Math.PI / 180)
  ctx.drawImage(src, -src.width / 2, -src.height / 2)
  return canvas
}

// Puntúa qué tan "reconocible como minuta" es un texto — usado para detectar
// la orientación correcta cuando la foto viene rotada (OCR de texto rotado
// produce palabras irreconocibles/espejadas, ej. "ENSALADA" → "VSIN3").
function puntajeMinuta(texto: string): number {
  const t = texto.toLowerCase()
  let score = 0
  ;['lunes','martes','miércoles','miercoles','jueves','viernes','sábado','sabado','domingo'].forEach(d => { if (t.includes(d)) score += 3 })
  ;['almuerzo','cena','ensalada','plato','acompañ','acompan','menu','menú'].forEach(k => { if (t.includes(k)) score += 2 })
  const fechas = t.match(/\d{1,2}[\/\-]\d{1,2}/g)
  score += Math.min(6, (fechas?.length || 0))
  return score
}

async function ocrCanvas(canvas: HTMLCanvasElement, onPaso?: (frac: number) => void): Promise<string> {
  const Tesseract = await import('tesseract.js')
  const { data } = await Tesseract.recognize(canvas, 'spa', {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text' && onPaso) onPaso(m.progress)
    },
  })
  return data.text
}

// Prueba la imagen en varias rotaciones y se queda con la que produzca texto
// más reconocible como minuta (soluciona fotos tomadas o escaneadas giradas).
async function ocrConRotacionAutomatica(canvasBase: HTMLCanvasElement, onProgress: (pct: number) => void): Promise<string> {
  const candidatos: { grados: number; canvas: HTMLCanvasElement }[] = [
    { grados: 0, canvas: canvasBase },
    { grados: 180, canvas: rotarCanvas(canvasBase, 180) },
  ]
  let mejorTexto = ''
  let mejorScore = -1
  for (let i = 0; i < candidatos.length; i++) {
    const texto = await ocrCanvas(candidatos[i].canvas, frac => onProgress(((i + frac) / 4) * 100))
    const score = puntajeMinuta(texto)
    if (score > mejorScore) { mejorScore = score; mejorTexto = texto }
    if (score >= 6) return mejorTexto // suficientemente bueno, no seguir probando
  }
  // Ninguna de las dos orientaciones obvias dio buen resultado: prueba 90° y 270°
  for (const grados of [90, 270] as const) {
    const i = grados === 90 ? 2 : 3
    const texto = await ocrCanvas(rotarCanvas(canvasBase, grados), frac => onProgress(((i + frac) / 4) * 100))
    const score = puntajeMinuta(texto)
    if (score > mejorScore) { mejorScore = score; mejorTexto = texto }
    if (score >= 6) return mejorTexto
  }
  return mejorTexto
}

async function ocrImagenes(images: (HTMLCanvasElement | File)[], onProgress: (pct: number) => void): Promise<string> {
  let texto = ''
  for (let i = 0; i < images.length; i++) {
    const canvas = images[i] instanceof File ? await archivoACanvas(images[i] as File) : images[i] as HTMLCanvasElement
    const parcial = await ocrConRotacionAutomatica(canvas, pct => onProgress((i + pct / 100) / images.length * 100))
    texto += parcial + '\n'
  }
  return texto
}

async function renderPdfPaginasACanvas(pdf: { numPages: number; getPage: (n: number) => Promise<unknown> }): Promise<HTMLCanvasElement[]> {
  const canvases: HTMLCanvasElement[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i) as { getViewport: (opts: { scale: number }) => { width: number; height: number }; render: (opts: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> } }
    const viewport = page.getViewport({ scale: 2.5 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')!
    await page.render({ canvasContext: ctx, viewport }).promise
    canvases.push(canvas)
  }
  return canvases
}

export default function SubirPage() {
  const [informe, setInforme] = useState<Informe | null>(null)
  const [error, setError] = useState('')
  const [arrastrando, setArrastrando] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [archivoNombre, setArchivoNombre] = useState('')
  const [tab, setTab] = useState<'resumen' | 'platos' | 'proteinas' | 'ensaladas' | 'semanas'>('resumen')
  const [pasoActual, setPasoActual] = useState(0)
  const [pasos, setPasos] = useState<PasoProgreso[]>([])
  const [pctOcr, setPctOcr] = useState<number | null>(null)
  const [textoDebug, setTextoDebug] = useState<string>('')
  const [mostrarTextoDebug, setMostrarTextoDebug] = useState(false)

  const EXTENSIONES_IMAGEN = ['jpg', 'jpeg', 'png', 'webp']

  const procesar = async (file: File) => {
    setError(''); setCargando(true); setArchivoNombre(file.name); setPasoActual(0); setPctOcr(null); setTextoDebug(''); setMostrarTextoDebug(false)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      let dias: DiaParsed[] = []

      if (ext === 'xlsx' || ext === 'xls') {
        setPasos(PASOS_EXCEL)
        setPasoActual(0)
        dias = await parsearExcel(file)
        setPasoActual(2)
      } else if (ext === 'docx') {
        setPasos(PASOS_DOCX)
        setPasoActual(0)
        const texto = await extraerTextoDocx(file)
        setTextoDebug(texto)
        setPasoActual(2)
        dias = parsearTextoLibre(texto, file.name)
        setPasoActual(3)
      } else if (EXTENSIONES_IMAGEN.includes(ext)) {
        setPasos(PASOS_IMG)
        setPasoActual(0)
        setPasoActual(1)
        const texto = await ocrImagenes([file], pct => setPctOcr(pct))
        setPctOcr(null)
        setTextoDebug(texto)
        if (texto.trim().length < 15) {
          setError('No se pudo reconocer texto en la foto. Asegúrate de que esté enfocada, con buena luz y sin inclinación — o ingresa la minuta manualmente en el Planificador.')
          setMostrarTextoDebug(true)
          return
        }
        setPasoActual(2)
        dias = parsearTextoLibre(texto, file.name)
        setPasoActual(3)
      } else if (ext === 'pdf') {
        setPasoActual(0)
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`
        const ab = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: ab }).promise

        setPasos(PASOS_PDF)
        setPasoActual(1)
        let texto = ''
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const content = await page.getTextContent()
          texto += content.items.map((item) => ('str' in item ? item.str : '')).join('\n') + '\n'
        }
        setPasoActual(2)

        if (texto.trim().length < 20) {
          // PDF sin texto digital (foto/escaneo) → fallback a OCR real
          setPasos(PASOS_PDF_OCR)
          setPasoActual(2)
          const canvases = await renderPdfPaginasACanvas(pdf as unknown as { numPages: number; getPage: (n: number) => Promise<unknown> })
          setPasoActual(3)
          texto = await ocrImagenes(canvases, pct => setPctOcr(pct))
          setPctOcr(null)
          setTextoDebug(texto)
          if (texto.trim().length < 15) {
            setError('No se pudo reconocer texto en este PDF escaneado. Asegúrate de que la foto/escaneo esté enfocado y con buena luz — o ingresa la minuta manualmente en el Planificador.')
            setMostrarTextoDebug(true)
            return
          }
          setPasoActual(4)
          dias = parsearTextoLibre(texto, file.name)
          setPasoActual(5)
        } else {
          setTextoDebug(texto)
          setPasoActual(3)
          dias = parsearTextoLibre(texto, file.name)
          setPasoActual(4)
        }
      } else {
        setError('Formato no soportado. Usa .xlsx, .xls, .docx, .pdf, .jpg o .png'); return
      }
      if (dias.length === 0) {
        setError('Se leyó el archivo pero no se reconoció estructura de días/servicios. Revisa el texto detectado abajo — si está incompleto o con errores, prueba con una foto más nítida o ingresa la minuta manualmente en el Planificador.')
        setMostrarTextoDebug(true)
        return
      }
      setInforme(generarInforme(dias, file.name)); setTab('resumen')
    } catch (e) {
      console.error(e); setError('Error leyendo el archivo. Verifica que sea un archivo de minuta válido.')
    } finally { setCargando(false); setPctOcr(null) }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setArrastrando(false)
    const file = e.dataTransfer.files[0]; if (file) procesar(file)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const exportarPDF = async () => {
    if (!informe) return
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    doc.setFillColor(31, 41, 55); doc.rect(0, 0, 210, 22, 'F')
    doc.setTextColor(255, 255, 255); doc.setFontSize(14); doc.setFont('helvetica', 'bold')
    doc.text('Informe de Análisis de Minuta', 10, 10)
    doc.setFontSize(9); doc.setFont('helvetica', 'normal')
    doc.text(`Archivo: ${informe.archivo} · ${informe.totalDias} días · Score: ${informe.score}/100`, 10, 17)
    let y = 28
    doc.setTextColor(31, 41, 55); doc.setFontSize(11); doc.setFont('helvetica', 'bold')
    doc.text('Resumen Ejecutivo', 10, y); y += 6
    autoTable(doc, {
      startY: y,
      body: [['Total días', String(informe.totalDias), 'Gap recomendado', `${informe.gapRecomendado} días`], ['Total servicios', String(informe.totalServicios), 'Platos con problema', String(informe.alertasPlato.filter(a => a.nivel === 'repetido').length)], ['Ensaladas repetidas', String(informe.alertasEnsalada.filter(a => a.nivel === 'repetida').length), 'Score', `${informe.score}/100`]],
      styles: { fontSize: 8 }, theme: 'grid',
      columnStyles: { 0: { fontStyle: 'bold', fillColor: [243,244,246] }, 2: { fontStyle: 'bold', fillColor: [243,244,246] } },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
    if (informe.alertasPlato.filter(a => a.nivel !== 'ok').length > 0) {
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.text('Platos con Repetición', 10, y); y += 4
      autoTable(doc, { startY: y, head: [['Plato', 'Proteína', 'Veces', 'Gap mínimo', 'Recomendado', 'Estado']], body: informe.alertasPlato.filter(a => a.nivel !== 'ok').map(a => [a.nombre, a.proteina, String(a.veces), `${a.gapMin} días`, `${a.gapRecomendado} días`, a.nivel === 'repetido' ? 'Repetido' : 'Cercano']), styles: { fontSize: 7.5 }, headStyles: { fillColor: [55,65,81], textColor: 255 } })
    }
    doc.save(`Informe_Minuta_${informe.archivo.replace(/\.[^.]+$/, '')}.pdf`)
  }

  const scoreStyle = informe ? (informe.score >= 80 ? { label: 'Variedad óptima', color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30' } : informe.score >= 60 ? { label: 'Variedad regular', color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30' } : { label: 'Con problemas', color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30' }) : null

  const tabDefs = [
    { id: 'resumen' as const, label: 'Resumen', icon: 'bar_chart' },
    { id: 'platos' as const, label: 'Platos', icon: 'restaurant_menu' },
    { id: 'proteinas' as const, label: 'Proteínas', icon: 'category' },
    { id: 'ensaladas' as const, label: 'Ensaladas', icon: 'nutrition' },
    { id: 'semanas' as const, label: 'Por Semana', icon: 'calendar_month' },
  ]

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      <div className="min-h-screen" style={{ background: '#0B0F19', fontFamily: 'Manrope, sans-serif', color: '#F8FAFC' }}>

        <AppHeader activePage="subir" rightSlot={informe ? (
          <button onClick={exportarPDF} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
            style={{ background: '#059669', color: '#fff' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>picture_as_pdf</span>
            <span className="hidden sm:inline">Exportar PDF</span>
          </button>
        ) : undefined} />

        <main className="w-full pt-16 max-w-[1720px] mx-auto px-8">
          {/* Page header */}
          <div className="pt-6 pb-4 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="flex flex-col gap-1 max-w-3xl">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="material-symbols-outlined text-[16px]">cloud_sync</span>
                  Pipeline de Ingesta
                </span>
                <span className="text-slate-600">/</span>
                <span className="text-slate-400">Extracción NLP &amp; OCR</span>
                <span className="text-slate-600">/</span>
                <span className="text-slate-400">Versión Heurística 2.4</span>
              </div>
              <h1 className="text-[28px] font-bold text-white tracking-tight leading-9">Importar Minuta Externa</h1>
              <p className="text-[14px] text-slate-400">Sube archivos en Excel (.xlsx), Word (.docx), PDF o una foto (.jpg/.png) para digitalizar minutas automáticamente mediante escaneo heurístico, OCR y mapeo inteligente al catálogo de faena.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a href="#" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-300 hover:text-white transition-colors text-[13px] font-semibold" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                <span className="material-symbols-outlined text-[18px] text-emerald-400">description</span>
                <span>Plantilla Excel Oficial (.xlsx)</span>
              </a>
              <a href="#" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-300 hover:text-white transition-colors text-[13px] font-semibold" style={{ background: '#131C2E', border: '1px solid #334155' }}>
                <span className="material-symbols-outlined text-[18px] text-slate-400">menu_book</span>
                <span>Guía de Mapeo</span>
              </a>
            </div>
          </div>

          {/* Dropzone */}
          <div className="rounded-xl p-6 mb-4" style={{ background: '#131C2E', border: '1px solid #334155', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.30)' }}>
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
              {/* Drop area */}
              <div
                className={`xl:col-span-7 flex flex-col justify-center items-center p-10 rounded-xl text-center relative overflow-hidden cursor-pointer transition-all ${arrastrando ? 'border-emerald-500' : 'hover:border-emerald-500/50'}`}
                style={{ background: '#1E293B', border: `2px dashed ${arrastrando ? '#10B981' : '#475569'}` }}
                onDrop={onDrop}
                onDragOver={e => { e.preventDefault(); setArrastrando(true) }}
                onDragLeave={() => setArrastrando(false)}
              >
                <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full pointer-events-none" style={{ background: 'rgba(16,185,129,0.10)', filter: 'blur(48px)' }} />
                {cargando ? (
                  <div className="flex flex-col items-center gap-4 text-slate-300 text-sm w-full max-w-sm">
                    <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <span className="font-semibold text-white">{pasos[pasoActual]?.label || 'Analizando minuta...'}</span>
                    {pctOcr !== null && <span className="text-[11px] text-emerald-400 font-bold -mt-2">{Math.round(pctOcr)}% reconocido</span>}
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: '#0F172A', border: '1px solid #334155' }}>
                      <div className="h-full rounded-full bg-emerald-500 transition-all duration-300 ease-out" style={{ width: `${pctOcr !== null && pasos[pasoActual + 1] ? pasos[pasoActual].pct + (pasos[pasoActual + 1].pct - pasos[pasoActual].pct) * (pctOcr / 100) : pasos[pasoActual]?.pct || 10}%`, boxShadow: '0 0 8px rgba(16,185,129,0.6)' }} />
                    </div>
                    <div className="flex flex-col gap-1 w-full">
                      {pasos.map((p, i) => (
                        <div key={p.label} className="flex items-center gap-2 text-[11px]">
                          <span className="material-symbols-outlined text-[14px]" style={{ color: i < pasoActual ? '#10B981' : i === pasoActual ? '#10B981' : '#475569' }}>
                            {i < pasoActual ? 'check_circle' : i === pasoActual ? 'progress_activity' : 'radio_button_unchecked'}
                          </span>
                          <span className={i <= pasoActual ? 'text-slate-300' : 'text-slate-600'}>{p.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-all" style={{ background: '#0F172A', border: '1px solid #334155' }}>
                      <span className="material-symbols-outlined text-[32px] text-emerald-400" style={{ fontVariationSettings: "'FILL' 1", filter: 'drop-shadow(0 0 8px rgba(16,185,129,0.5))' }}>cloud_upload</span>
                    </div>
                    <h3 className="font-bold text-white text-[16px] mb-1">Arrastra tu archivo aquí o haz clic para explorar</h3>
                    <p className="text-slate-400 text-[13px] max-w-md mb-4">Soporta planillas operativas, minutas escaneadas o circulares oficiales con segmentación por turnos de faena.</p>
                    <div className="flex items-center gap-2 flex-wrap justify-center mb-4">
                      {[{ icon: 'table_chart', label: 'Excel .xlsx / .xls', color: 'text-emerald-400' }, { icon: 'article', label: 'Word .docx / .doc', color: 'text-slate-400' }, { icon: 'picture_as_pdf', label: 'PDF (OCR)', color: 'text-amber-400' }, { icon: 'photo_camera', label: 'Foto .jpg / .png (OCR)', color: 'text-sky-400' }].map(f => (
                        <span key={f.label} className="inline-flex items-center gap-1 px-2 py-1 rounded text-slate-300 text-[11px] font-bold" style={{ background: '#0F172A', border: '1px solid #334155' }}>
                          <span className={`material-symbols-outlined text-[14px] ${f.color}`}>{f.icon}</span>
                          {f.label}
                        </span>
                      ))}
                    </div>
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[13px] font-semibold transition-colors" style={{ boxShadow: '0 4px 6px -1px rgba(16,185,129,0.25)' }}>
                      <span className="material-symbols-outlined text-[18px]">folder_open</span>
                      <span>Seleccionar archivo</span>
                      <input type="file" accept=".xlsx,.xls,.docx,.pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) procesar(f) }} />
                    </label>
                    {archivoNombre && <p className="text-[11px] text-slate-400 mt-2">Archivo actual: <strong className="text-slate-200">{archivoNombre}</strong></p>}
                  </>
                )}
              </div>

              {/* File info card */}
              <div className="xl:col-span-5 flex flex-col justify-between p-5 rounded-xl relative overflow-hidden" style={{ background: '#131C2E', border: '1px solid #334155' }}>
                {informe ? (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                          <span className="material-symbols-outlined text-[28px] text-emerald-400" style={{ fontVariationSettings: "'FILL' 1" }}>description</span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-white text-[15px] truncate">{informe.archivo}</span>
                          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-emerald-400 text-[11px] font-bold w-fit" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.30)' }}>
                            <span className="material-symbols-outlined text-[13px]">check_circle</span>
                            Procesado con éxito · {informe.totalDias} días
                          </span>
                        </div>
                      </div>
                      <button onClick={() => { setInforme(null); setArchivoNombre('') }} className="text-slate-400 hover:text-red-400 p-1 rounded transition-colors">
                        <span className="material-symbols-outlined text-[20px]">close</span>
                      </button>
                    </div>
                    <div className="my-4 p-3 rounded-lg" style={{ background: '#0F172A', border: '1px solid #334155' }}>
                      <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1.5">
                        <span>Segmentación Semántica</span>
                        <span className="text-emerald-400">{informe.totalDias} Días / {informe.totalServicios} Servicios</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#1E293B' }}>
                        <div className="h-full rounded-full bg-emerald-500 w-full" style={{ boxShadow: '0 0 8px rgba(16,185,129,0.5)' }} />
                      </div>
                    </div>
                    {/* Score display */}
                    <div className={`flex items-center justify-between p-3 rounded-lg border ${scoreStyle?.bg}`}>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Score de Variedad</span>
                        <span className={`text-[32px] font-black leading-none ${scoreStyle?.color}`}>{informe.score}<span className="text-[16px] font-bold text-slate-500">/100</span></span>
                        <span className={`text-[11px] font-bold ${scoreStyle?.color}`}>{scoreStyle?.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" style={{ boxShadow: '0 0 6px rgba(16,185,129,0.8)' }} />
                        <span className="text-[11px] font-semibold text-slate-400">Parser v4.8 listo</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-8">
                    <span className="material-symbols-outlined text-[48px] text-slate-600">inbox</span>
                    <p className="text-slate-400 text-[13px]">Sube un archivo para ver la telemetría de extracción aquí</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl text-[13px]" style={{ background: '#450a0a', border: '1px solid #f87171', color: '#fca5a5' }}>
              <div className="flex items-center gap-2 px-4 py-3 font-semibold">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {error}
              </div>
              {textoDebug && (
                <div className="px-4 pb-3">
                  <button onClick={() => setMostrarTextoDebug(v => !v)} className="text-[12px] font-semibold text-red-300 hover:text-white underline underline-offset-2">
                    {mostrarTextoDebug ? 'Ocultar' : 'Ver'} texto detectado por OCR/lectura ({textoDebug.trim().length} caracteres)
                  </button>
                  {mostrarTextoDebug && (
                    <pre className="mt-2 p-3 rounded-lg text-[11px] text-slate-300 whitespace-pre-wrap max-h-60 overflow-y-auto" style={{ background: '#0F172A', border: '1px solid #334155' }}>
                      {textoDebug.trim() || '(sin texto)'}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Informe completo */}
          {informe && (
            <>
              {/* Métricas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Total Días', value: informe.totalDias, sub: 'analizados', icon: 'calendar_today', iconColor: 'text-sky-400' },
                  { label: 'Platos Repetidos', value: informe.alertasPlato.filter(a => a.nivel === 'repetido').length, sub: 'con gap corto', icon: 'warning', iconColor: 'text-red-400' },
                  { label: 'Platos Similares', value: informe.gruposBase.length, sub: 'grupos detectados', icon: 'content_copy', iconColor: 'text-violet-400' },
                  { label: 'Ensaladas Repetidas', value: informe.alertasEnsalada.filter(a => a.nivel === 'repetida').length, sub: 'en el ciclo', icon: 'nutrition', iconColor: 'text-amber-400' },
                ].map((tile, i) => (
                  <div key={i} className="p-4 rounded-xl flex items-center justify-between" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{tile.label}</span>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-[32px] font-black text-white leading-none">{tile.value}</span>
                        <span className="text-[11px] font-bold text-slate-400">{tile.sub}</span>
                      </div>
                    </div>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tile.iconColor}`} style={{ background: '#0F172A', border: '1px solid #334155' }}>
                      <span className="material-symbols-outlined text-[22px]">{tile.icon}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 border-b border-[#334155] mb-4">
                {tabDefs.map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)} className={`relative pb-3 pt-2 px-3 flex items-center gap-2 transition-colors text-[14px] font-semibold whitespace-nowrap ${tab === t.id ? 'text-emerald-400' : 'text-slate-400 hover:text-white'}`}>
                    <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
                    <span>{t.label}</span>
                    {tab === t.id && <span className="absolute bottom-[-1px] left-0 right-0 h-[2.5px] bg-emerald-400 rounded-t-full" />}
                  </button>
                ))}
              </div>

              {/* TAB RESUMEN */}
              {tab === 'resumen' && (
                <div className="space-y-4 pb-8">
                  {/* Distribución proteína */}
                  <div className="rounded-xl p-5" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                    <h3 className="font-bold text-white text-[15px] mb-4">Distribución por proteína</h3>
                    <div className="flex flex-wrap gap-3">
                      {informe.distribucionProteina.map(d => (
                        <div key={d.tipo} className={`rounded-xl p-3 text-center min-w-[90px] ${PROT_BADGE[d.tipo] || PROT_BADGE.Otro}`} style={{ background: '#0F172A' }}>
                          <div className="text-[28px] font-black leading-none">{d.veces}</div>
                          <div className="text-[11px] font-bold mt-0.5">{d.tipo}</div>
                          <div className="text-[10px] opacity-70">{d.pct}%</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {informe.alertasProteina.filter(a => a.diasConsecutivos.length > 0).length > 0 && (
                    <div className="rounded-xl p-5" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.30)' }}>
                      <h3 className="font-bold text-amber-400 text-[14px] mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">warning</span>
                        Proteína repetida días seguidos
                      </h3>
                      <div className="space-y-2">
                        {informe.alertasProteina.filter(a => a.diasConsecutivos.length > 0).map(a => (
                          <div key={a.tipo} className="flex items-center justify-between rounded-lg px-4 py-2" style={{ background: '#0F172A', border: '1px solid rgba(245,158,11,0.30)' }}>
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${PROT_BADGE[a.tipo] || PROT_BADGE.Otro}`}>{a.tipo}</span>
                            <div className="text-[13px] text-amber-300">{a.diasConsecutivos.map((r, i) => <span key={i} className="mr-2">Días {r.join('→')}</span>)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {informe.gruposBase.length > 0 && (
                    <div className="rounded-xl p-5" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.30)' }}>
                      <h3 className="font-bold text-violet-400 text-[14px] mb-1 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">content_copy</span>
                        Platos similares detectados
                      </h3>
                      <p className="text-[12px] text-violet-300/70 mb-3">Distintas preparaciones de la misma proteína base — el trabajador percibe que come lo mismo.</p>
                      <div className="space-y-2">
                        {informe.gruposBase.map(g => (
                          <div key={g.base} className="rounded-lg p-3" style={{ background: '#0F172A', border: '1px solid rgba(139,92,246,0.30)' }}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-violet-300 text-[13px]">{g.base}</span>
                              <span className="text-[11px] text-violet-300/70">{g.platos.length} preparaciones · {g.vecesTotal} veces · Días: {g.dias.join(', ')}</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {g.platos.map(p => <span key={p} className="text-[11px] px-2 py-0.5 rounded text-violet-300" style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.30)' }}>{p}</span>)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl p-5" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                    <h3 className="font-bold text-white text-[15px] mb-3">Acompañamientos más usados</h3>
                    <div className="space-y-2">
                      {informe.acompsTop.map(a => (
                        <div key={a.nombre} className="flex items-center gap-3">
                          <span className="text-[13px] text-slate-300 w-52 truncate">{a.nombre}</span>
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#0F172A' }}>
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(a.veces / (informe.acompsTop[0]?.veces || 1)) * 100}%` }} />
                          </div>
                          <span className="text-[13px] font-bold text-slate-200 w-6 text-right">{a.veces}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB PLATOS */}
              {tab === 'platos' && (
                <div className="space-y-4 pb-8">
                  <div className="px-4 py-3 rounded-lg text-[13px] text-slate-300" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                    Gap recomendado: <strong className="text-emerald-400">{informe.gapRecomendado} días</strong> ({informe.totalDias} días ÷ {informe.alertasPlato.length} platos distintos)
                  </div>
                  {(['repetido', 'cercano', 'ok'] as const).map(nivel => {
                    const grupo = informe.alertasPlato.filter(a => a.nivel === nivel)
                    if (grupo.length === 0) return null
                    const cfg = { repetido: { label: 'Repetición problemática', border: 'border-red-900/50', icon: 'error', iconColor: 'text-red-400' }, cercano: { label: 'Cercanos — revisar', border: 'border-amber-900/50', icon: 'warning', iconColor: 'text-amber-400' }, ok: { label: 'Sin problemas', border: 'border-[#334155]', icon: 'check_circle', iconColor: 'text-emerald-400' } }[nivel]
                    return (
                      <div key={nivel} className={`rounded-xl p-4 border ${cfg.border}`} style={{ background: nivel === 'repetido' ? 'rgba(127,29,29,0.15)' : nivel === 'cercano' ? 'rgba(120,53,15,0.15)' : '#1E293B' }}>
                        <h3 className="font-bold text-white text-[14px] mb-3 flex items-center gap-2">
                          <span className={`material-symbols-outlined text-[18px] ${cfg.iconColor}`}>{cfg.icon}</span>
                          {cfg.label} <span className="font-normal text-slate-400">({grupo.length})</span>
                        </h3>
                        <div className="space-y-2">
                          {grupo.map(a => (
                            <div key={a.nombre} className="flex items-center justify-between px-4 py-2.5 rounded-lg flex-wrap gap-2" style={{ background: '#0F172A', border: '1px solid #334155' }}>
                              <div className="flex items-center gap-2">
                                <span className="text-[14px] font-semibold text-white">{a.nombre}</span>
                                <span className={`text-[11px] px-2 py-0.5 rounded-full ${PROT_BADGE[a.proteina] || PROT_BADGE.Otro}`}>{a.proteina}</span>
                              </div>
                              <div className="flex items-center gap-4 text-[12px] text-slate-400">
                                <span><strong className="text-white">{a.veces}×</strong></span>
                                {a.veces > 1 && <span>Gap: <strong className={nivel === 'repetido' ? 'text-red-400' : nivel === 'cercano' ? 'text-amber-400' : 'text-white'}>{a.gapMin}d</strong></span>}
                                <span>Días: {a.dias.join(', ')}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* TAB PROTEÍNAS */}
              {tab === 'proteinas' && (
                <div className="space-y-3 pb-8">
                  {informe.alertasProteina.map(a => (
                    <div key={a.tipo} className="rounded-xl p-5" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <span className={`text-[12px] font-bold px-3 py-1 rounded-full ${PROT_BADGE[a.tipo] || PROT_BADGE.Otro}`}>{a.tipo}</span>
                          <span className="text-slate-400 text-[13px]">{a.veces} apariciones · {a.pct}% del total</span>
                        </div>
                        {a.diasConsecutivos.length > 0 && (
                          <span className="text-[11px] font-bold px-2 py-1 rounded-full text-amber-300" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.30)' }}>
                            ⚠ {a.diasConsecutivos.length} racha(s) consecutiva(s)
                          </span>
                        )}
                      </div>
                      <div className="w-full h-1.5 rounded-full mb-3 overflow-hidden" style={{ background: '#0F172A' }}>
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${a.pct}%` }} />
                      </div>
                      {a.diasConsecutivos.length > 0 && (
                        <div className="text-[13px] text-amber-300 rounded-lg p-3 mb-3" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                          <strong>Días consecutivos:</strong> {a.diasConsecutivos.map(r => r.join(' → ')).join(' | ')}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {informe.alertasPlato.filter(p => p.proteina === a.tipo).map(p => (
                          <span key={p.nombre} className={`text-[11px] px-2 py-0.5 rounded-full border ${p.nivel === 'repetido' ? 'bg-red-950/60 border-red-800/60 text-red-300' : p.nivel === 'cercano' ? 'bg-amber-950/60 border-amber-700/60 text-amber-300' : 'text-slate-400 border-slate-700'}`} style={p.nivel === 'ok' ? { background: '#0F172A' } : {}}>
                            {p.nombre} ({p.veces}×)
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB ENSALADAS */}
              {tab === 'ensaladas' && (
                <div className="pb-8">
                  <div className="rounded-xl overflow-hidden" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                    <div className="px-5 py-3 border-b border-[#334155]" style={{ background: '#0F172A' }}>
                      <p className="text-[13px] text-slate-400">En un ciclo ideal cada ensalada aparece solo una vez. Las repetidas indican que el trabajador comió la misma más de una vez.</p>
                    </div>
                    <div className="divide-y divide-[#334155]">
                      {informe.alertasEnsalada.map(e => (
                        <div key={e.nombre} className="flex items-center justify-between px-5 py-3 hover:bg-[#243347] transition-colors">
                          <span className="text-[14px] text-white font-medium">{e.nombre}</span>
                          <div className="flex items-center gap-4 text-[12px]">
                            {e.nivel === 'repetida'
                              ? <span className="font-bold text-amber-400 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">warning</span>{e.veces}× repetida</span>
                              : <span className="font-bold text-emerald-400 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">check_circle</span>1×</span>
                            }
                            <span className="text-slate-400">Días: {e.dias.join(', ')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB SEMANAS */}
              {tab === 'semanas' && (
                <div className="space-y-6 pb-8">
                  {informe.semanas.map(sem => (
                    <div key={sem.num} className="rounded-xl overflow-hidden" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                      <div className="px-5 py-2.5 font-bold text-[13px] text-slate-300" style={{ background: '#0F172A', borderBottom: '1px solid #334155' }}>
                        Semana {sem.num} · {sem.dias[0]?.fecha} al {sem.dias[sem.dias.length - 1]?.fecha}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-[#334155]" style={{ background: '#131C2E' }}>
                              <th className="p-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 w-20">Servicio</th>
                              {sem.dias.map(d => (
                                <th key={d.dia} className="p-2 text-center text-white">
                                  <div className="font-bold">{d.diaSemana}</div>
                                  <div className="text-slate-400 text-[10px]">{d.fecha}</div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(['Almuerzo', 'Cena'] as const).map(tipo => (
                              <tr key={tipo} className="border-t border-[#334155]">
                                <td className="p-2 font-bold text-[10px] uppercase tracking-wider text-slate-400">{tipo}</td>
                                {sem.dias.map(dia => {
                                  const svc = dia.servicios.find(s => s.tipo === tipo)
                                  const proteina = svc ? clasificarProteina(svc.platoPrincipal) : ''
                                  const alerta = svc ? informe.alertasPlato.find(a => a.nombre === svc.platoPrincipal)?.nivel : 'ok'
                                  return (
                                    <td key={dia.dia} className="p-2 text-center border-l border-[#334155]">
                                      {svc ? (
                                        <>
                                          <div className={`text-[10px] font-semibold leading-tight px-1 py-0.5 rounded ${alerta === 'repetido' ? 'bg-red-950/60 text-red-300' : alerta === 'cercano' ? 'bg-amber-950/60 text-amber-300' : 'text-slate-200'}`}>{svc.platoPrincipal}</div>
                                          <span className={`text-[9px] mt-0.5 px-1 py-0.5 rounded-full inline-block ${PROT_BADGE[proteina] || PROT_BADGE.Otro}`}>{proteina}</span>
                                          {svc.ensalada && <div className="text-[9px] text-slate-400 mt-0.5">{svc.ensalada}</div>}
                                        </>
                                      ) : <span className="text-slate-600">—</span>}
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Footer de acción */}
              <div className="sticky bottom-0 py-4 -mx-8 px-8" style={{ background: 'linear-gradient(to top, #0B0F19 80%, transparent)', paddingBottom: '1.5rem' }}>
                <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-4 rounded-xl" style={{ background: '#0F172A', border: '1px solid #334155' }}>
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 8px rgba(16,185,129,0.8)' }} />
                    <span className="font-bold text-white text-[14px]">{informe.totalServicios} servicios analizados</span>
                    <span className="text-slate-400 text-[13px]">· {informe.alertasPlato.filter(a => a.nivel === 'repetido').length} problemas de repetición detectados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setInforme(null); setArchivoNombre('') }} className="px-4 py-2 rounded-lg text-slate-400 hover:text-white text-[13px] font-semibold transition-colors hover:bg-[#1E293B]">
                      Cancelar
                    </button>
                    <button onClick={exportarPDF} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-slate-200 text-[13px] font-semibold transition-colors" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                      <span className="material-symbols-outlined text-[18px] text-slate-400">summarize</span>
                      Exportar Log PDF
                    </button>
                    <Link href="/" className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[14px] transition-all" style={{ boxShadow: '0 10px 15px -3px rgba(16,185,129,0.25)' }}>
                      <span className="material-symbols-outlined text-[20px]">database_upload</span>
                      <span>Ir al Planificador</span>
                    </Link>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="w-full py-5 border-t border-[#334155]" style={{ background: '#0F172A' }}>
          <div className="w-full px-8 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="font-bold text-white text-[15px]">Minuta Web</span>
              <span className="text-slate-400 text-xs">• Sistema Operativo de Servicios Gastronómicos y Minería</span>
            </div>
            <div className="flex items-center gap-5 text-slate-400 text-[13px] font-semibold">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Sincronizado en línea</span>
              <span>Cumplimiento Sanitario Seremi v4.8</span>
              <span>© 2025 Minuta Web Industrial.</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
