'use client'

import { useState, useCallback } from 'react'
import * as XLSX from 'xlsx'

interface ServicioParsed {
  tipo: string
  ensalada: string
  acompañamiento: string
  platoPrincipal: string
  postre?: string
  estado: string
}

interface DiaParsed {
  dia: number
  fecha: string
  diaSemana: string
  servicios: ServicioParsed[]
}

// ── Clasificación de proteína base ─────────────────────────────
const PROTEINAS: { tipo: string; keywords: string[] }[] = [
  { tipo: 'Vacuno',   keywords: ['vacuno','carne','asado','estofado','mechada','albóndiga','albondiga','tortica','bistec','chopsui de v','lomo','osobuco','cazuela de vac','plateada','malaya'] },
  { tipo: 'Cerdo',    keywords: ['cerdo','chuleta','medalla','costilla','pernil','tocino','chicharrón','chicharron'] },
  { tipo: 'Pollo',    keywords: ['pollo','gallina','pavo'] },
  { tipo: 'Pescado',  keywords: ['pescado','merluza','salmón','salmon','atún','atun','congrio','reineta','jurel','sardina','camaron','camarón','marisco','mariscos'] },
  { tipo: 'Pasta',    keywords: ['spaghetti','mostaccioli','espirales','fettuccine','pasta','tallarín','tallarin','lasaña','lasana','macarrón','macarron'] },
  { tipo: 'Legumbre', keywords: ['lentejas','porotos','garbanzos','arvejas','habas','legumbre'] },
  { tipo: 'Vegetariano', keywords: ['vegetariano','vegano','tofu','berenjena rellena','zapallo relleno','tortilla de verd'] },
]

function clasificarProteina(nombre: string): string {
  const n = nombre.toLowerCase()
  for (const p of PROTEINAS) {
    if (p.keywords.some(k => n.includes(k))) return p.tipo
  }
  return 'Otro'
}

// Detecta ingrediente base (ej: "Pollo" de "Pollo Arverjado" y "Pollo Casero")
function extraerBase(nombre: string): string {
  const proteina = clasificarProteina(nombre)
  return proteina !== 'Otro' ? proteina : nombre.split(' ').slice(0, 2).join(' ')
}

// ── Tipos de informe ───────────────────────────────────────────
interface AlertaPlato {
  nombre: string
  proteina: string
  veces: number
  dias: number[]
  gapMin: number
  gapRecomendado: number
  nivel: 'ok' | 'cercano' | 'repetido'
}

interface AlertaProteina {
  tipo: string
  veces: number
  diasConsecutivos: number[][]
  pct: number
}

interface AlertaEnsalada {
  nombre: string
  veces: number
  dias: number[]
  nivel: 'ok' | 'repetida'
}

interface GrupoBase {
  base: string
  platos: string[]
  vecesTotal: number
  dias: number[]
}

interface Informe {
  archivo: string
  totalDias: number
  totalServicios: number
  confirmados: number
  gapRecomendado: number
  score: number
  alertasPlato: AlertaPlato[]
  alertasProteina: AlertaProteina[]
  alertasEnsalada: AlertaEnsalada[]
  gruposBase: GrupoBase[]
  acompsTop: { nombre: string; veces: number }[]
  distribucionProteina: { tipo: string; veces: number; pct: number }[]
  semanas: { num: number; dias: DiaParsed[] }[]
}

function calcGapMin(posiciones: number[]): number {
  if (posiciones.length < 2) return 999
  let min = 999
  for (let i = 1; i < posiciones.length; i++) min = Math.min(min, posiciones[i] - posiciones[i - 1])
  return min
}

function generarInforme(dias: DiaParsed[], archivo: string): Informe {
  const totalDias = dias.length
  const totalServicios = dias.reduce((a, d) => a + d.servicios.length, 0)
  const confirmados = dias.reduce((a, d) => a + d.servicios.filter(s => s.estado === 'Confirmado').length, 0)

  // Platos únicos
  const mapaPlatos = new Map<string, { dias: number[]; proteina: string }>()
  const mapaEnsaladas = new Map<string, number[]>()
  const mapaAcomps = new Map<string, number>()
  const mapaProteina = new Map<string, number[]>()
  const mapaBase = new Map<string, { platos: Set<string>; dias: number[] }>()

  dias.forEach((dia, di) => {
    dia.servicios.forEach(svc => {
      const plato = svc.platoPrincipal?.trim()
      const ensalada = svc.ensalada?.trim()
      const acomp = svc.acompañamiento?.trim()
      if (!plato || plato === 'Por Definir') return

      const proteina = clasificarProteina(plato)
      const base = extraerBase(plato)

      // platos
      const ep = mapaPlatos.get(plato) || { dias: [], proteina }
      ep.dias.push(di + 1)
      mapaPlatos.set(plato, ep)

      // proteína
      const eprot = mapaProteina.get(proteina) || []
      eprot.push(di + 1)
      mapaProteina.set(proteina, eprot)

      // base
      const eb = mapaBase.get(base) || { platos: new Set(), dias: [] }
      eb.platos.add(plato)
      eb.dias.push(di + 1)
      mapaBase.set(base, eb)

      // ensalada
      if (ensalada && ensalada !== 'Por Definir') {
        const ee = mapaEnsaladas.get(ensalada) || []
        ee.push(di + 1)
        mapaEnsaladas.set(ensalada, ee)
      }

      // acomp
      if (acomp && acomp !== 'Por Definir') {
        mapaAcomps.set(acomp, (mapaAcomps.get(acomp) || 0) + 1)
      }
    })
  })

  const platosUnicos = mapaPlatos.size
  const gapRecomendado = Math.min(7, Math.max(3, Math.floor(totalDias / Math.max(1, platosUnicos))))

  // Alertas platos
  const alertasPlato: AlertaPlato[] = Array.from(mapaPlatos.entries()).map(([nombre, d]) => {
    const gapMin = calcGapMin(d.dias)
    const nivel: AlertaPlato['nivel'] =
      d.dias.length === 1 ? 'ok'
      : gapMin < gapRecomendado ? 'repetido'
      : gapMin < gapRecomendado + 2 ? 'cercano'
      : 'ok'
    return { nombre, proteina: d.proteina, veces: d.dias.length, dias: d.dias, gapMin: gapMin === 999 ? 0 : gapMin, gapRecomendado, nivel }
  }).sort((a, b) => {
    const order = { repetido: 0, cercano: 1, ok: 2 }
    return order[a.nivel] - order[b.nivel] || b.veces - a.veces
  })

  // Alertas proteína — detectar días consecutivos
  const alertasProteina: AlertaProteina[] = Array.from(mapaProteina.entries()).map(([tipo, diasList]) => {
    const unique = [...new Set(diasList)].sort((a, b) => a - b)
    const pct = Math.round((diasList.length / totalServicios) * 100)
    // detectar rachas consecutivas (2+ días seguidos misma proteína)
    const rachas: number[][] = []
    let racha: number[] = [unique[0]]
    for (let i = 1; i < unique.length; i++) {
      if (unique[i] - unique[i - 1] <= 1) {
        racha.push(unique[i])
      } else {
        if (racha.length >= 2) rachas.push([...racha])
        racha = [unique[i]]
      }
    }
    if (racha.length >= 2) rachas.push(racha)
    return { tipo, veces: diasList.length, diasConsecutivos: rachas, pct }
  }).sort((a, b) => b.veces - a.veces)

  // Grupos base (platos similares)
  const gruposBase: GrupoBase[] = Array.from(mapaBase.entries())
    .filter(([, v]) => v.platos.size >= 2)
    .map(([base, v]) => ({
      base,
      platos: Array.from(v.platos),
      vecesTotal: v.dias.length,
      dias: [...new Set(v.dias)].sort((a, b) => a - b),
    }))
    .sort((a, b) => b.platos.length - a.platos.length)

  // Alertas ensalada
  const alertasEnsalada: AlertaEnsalada[] = Array.from(mapaEnsaladas.entries()).map(([nombre, diasList]) => ({
    nombre,
    veces: diasList.length,
    dias: diasList,
    nivel: (diasList.length > 1 ? 'repetida' : 'ok') as AlertaEnsalada['nivel'],
  })).sort((a, b) => b.veces - a.veces)

  // Acomps top 10
  const acompsTop = Array.from(mapaAcomps.entries())
    .map(([nombre, veces]) => ({ nombre, veces }))
    .sort((a, b) => b.veces - a.veces)
    .slice(0, 10)

  // Distribución proteína
  const distribucionProteina = Array.from(mapaProteina.entries())
    .map(([tipo, d]) => ({ tipo, veces: d.length, pct: Math.round(d.length / totalServicios * 100) }))
    .sort((a, b) => b.veces - a.veces)

  // Semanas
  const semanas = []
  for (let i = 0; i < totalDias; i += 7) {
    semanas.push({ num: Math.floor(i / 7) + 1, dias: dias.slice(i, i + 7) })
  }

  // Score: empieza en 100, descuenta por problemas
  let score = 100
  const repetidos = alertasPlato.filter(a => a.nivel === 'repetido').length
  const cercanos  = alertasPlato.filter(a => a.nivel === 'cercano').length
  const ensRepetidas = alertasEnsalada.filter(a => a.nivel === 'repetida').length
  const protConsec = alertasProteina.reduce((a, p) => a + p.diasConsecutivos.length, 0)
  score -= repetidos * 8
  score -= cercanos * 3
  score -= ensRepetidas * 2
  score -= protConsec * 5
  score = Math.max(0, Math.min(100, score))

  return {
    archivo, totalDias, totalServicios, confirmados, gapRecomendado, score,
    alertasPlato, alertasProteina, alertasEnsalada, gruposBase, acompsTop,
    distribucionProteina, semanas,
  }
}

function parsearExcel(file: File): Promise<DiaParsed[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const hojaMinuta = wb.SheetNames.find(n =>
          n.toLowerCase().includes('minuta') || n.toLowerCase().includes('días') || n.toLowerCase().includes('dias')
        ) || wb.SheetNames[0]
        const ws = wb.Sheets[hojaMinuta]
        const rows: (string | number)[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
        const dias: DiaParsed[] = []
        let diaActual: DiaParsed | null = null
        for (const row of rows) {
          const cols = row.map(c => String(c || '').trim())
          const [c0, c1, c2, c3, c4, c5, c6] = cols
          const numDia = parseInt(c0)
          if (!isNaN(numDia) && numDia > 0 && numDia <= 31) {
            diaActual = { dia: numDia, fecha: c1, diaSemana: c2, servicios: [] }
            dias.push(diaActual)
            if (c3) diaActual.servicios.push({ tipo: c3, ensalada: c4, acompañamiento: c5, platoPrincipal: c6, estado: String(row[7] || '').trim() || 'Por Confirmar' })
          } else if (diaActual && (c3 === 'Almuerzo' || c3 === 'Cena')) {
            diaActual.servicios.push({ tipo: c3, ensalada: c4, acompañamiento: c5, platoPrincipal: c6, estado: String(row[7] || '').trim() || 'Por Confirmar' })
          }
        }
        resolve(dias.filter(d => d.servicios.length > 0))
      } catch (err) { reject(err) }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

// ── Colores ────────────────────────────────────────────────────
const PROT_COLOR: Record<string, string> = {
  Vacuno: 'bg-red-100 text-red-700 border-red-200',
  Cerdo: 'bg-pink-100 text-pink-700 border-pink-200',
  Pollo: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Pescado: 'bg-blue-100 text-blue-700 border-blue-200',
  Pasta: 'bg-orange-100 text-orange-700 border-orange-200',
  Legumbre: 'bg-green-100 text-green-700 border-green-200',
  Vegetariano: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Otro: 'bg-gray-100 text-gray-600 border-gray-200',
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'text-green-600 bg-green-50 border-green-200'
    : score >= 60 ? 'text-yellow-600 bg-yellow-50 border-yellow-200'
    : 'text-red-600 bg-red-50 border-red-200'
  const label = score >= 80 ? 'Buena' : score >= 60 ? 'Regular' : 'Con problemas'
  return (
    <div className={`rounded-2xl border px-6 py-4 text-center ${color}`}>
      <div className="text-5xl font-black">{score}</div>
      <div className="text-sm font-bold mt-1">/100</div>
      <div className="text-xs mt-1 font-semibold uppercase tracking-wide">{label}</div>
    </div>
  )
}

export default function SubirPage() {
  const [informe, setInforme] = useState<Informe | null>(null)
  const [error, setError] = useState('')
  const [arrastrando, setArrastrando] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [tabActiva, setTabActiva] = useState<'resumen' | 'platos' | 'proteinas' | 'ensaladas' | 'semanas'>('resumen')

  const procesar = async (file: File) => {
    setError('')
    setCargando(true)
    try {
      const d = await parsearExcel(file)
      if (d.length === 0) { setError('No se encontraron días. Verifica que sea un archivo de minuta.'); return }
      setInforme(generarInforme(d, file.name))
      setTabActiva('resumen')
    } catch {
      setError('Error leyendo el archivo. Asegúrate que sea .xlsx o .xls válido.')
    } finally {
      setCargando(false)
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setArrastrando(false)
    const file = e.dataTransfer.files[0]
    if (file) procesar(file)
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
      body: [
        ['Total días', String(informe.totalDias), 'Gap recomendado', `${informe.gapRecomendado} días`],
        ['Total servicios', String(informe.totalServicios), 'Platos con problema', String(informe.alertasPlato.filter(a => a.nivel === 'repetido').length)],
        ['Ensaladas repetidas', String(informe.alertasEnsalada.filter(a => a.nivel === 'repetida').length), 'Score', `${informe.score}/100`],
      ],
      styles: { fontSize: 8 }, theme: 'grid',
      columnStyles: { 0: { fontStyle: 'bold', fillColor: [243,244,246] }, 2: { fontStyle: 'bold', fillColor: [243,244,246] } },
    })

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8

    if (informe.alertasPlato.filter(a => a.nivel !== 'ok').length > 0) {
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.text('Platos con Repetición', 10, y); y += 4
      autoTable(doc, {
        startY: y,
        head: [['Plato', 'Proteína', 'Veces', 'Gap mínimo', 'Recomendado', 'Estado']],
        body: informe.alertasPlato.filter(a => a.nivel !== 'ok').map(a => [
          a.nombre, a.proteina, String(a.veces), `${a.gapMin} días`, `${a.gapRecomendado} días`,
          a.nivel === 'repetido' ? '🚨 Repetido' : '⚠ Cercano',
        ]),
        styles: { fontSize: 7.5 },
        headStyles: { fillColor: [55,65,81], textColor: 255 },
      })
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
    }

    if (informe.gruposBase.length > 0) {
      if (y > 240) { doc.addPage(); y = 15 }
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.text('Platos Similares (misma proteína base)', 10, y); y += 4
      autoTable(doc, {
        startY: y,
        head: [['Base proteica', 'Platos distintos', 'Total apariciones', 'Días']],
        body: informe.gruposBase.map(g => [
          g.base, g.platos.join(' / '), String(g.vecesTotal), g.dias.join(', '),
        ]),
        styles: { fontSize: 7.5 },
        headStyles: { fillColor: [124,58,237], textColor: 255 },
      })
    }

    doc.save(`Informe_Minuta_${informe.archivo.replace(/\.[^.]+$/, '')}.pdf`)
  }

  const tabs: { id: typeof tabActiva; label: string }[] = [
    { id: 'resumen', label: '📊 Resumen' },
    { id: 'platos', label: '🥩 Platos' },
    { id: 'proteinas', label: '💪 Proteínas' },
    { id: 'ensaladas', label: '🥗 Ensaladas' },
    { id: 'semanas', label: '📅 Por semana' },
  ]

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-900 text-white px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Análisis de Minuta Externa</h1>
            <p className="text-gray-400 text-sm">Sube un Excel de minuta y genera un informe detallado</p>
          </div>
          <div className="flex items-center gap-3">
            {informe && (
              <button onClick={exportarPDF} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-sm rounded-lg font-semibold">
                📄 Exportar informe PDF
              </button>
            )}
            <a href="/" className="text-gray-400 hover:text-white text-sm">← Volver</a>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Upload */}
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center mb-6 transition-colors cursor-pointer ${arrastrando ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:border-gray-400'}`}
          onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); setArrastrando(true) }}
          onDragLeave={() => setArrastrando(false)}
        >
          {cargando ? (
            <p className="text-gray-500">Analizando minuta...</p>
          ) : (
            <>
              <div className="text-4xl mb-2">📊</div>
              <p className="text-gray-600 font-medium mb-1">Arrastra tu Excel aquí o</p>
              <label className="cursor-pointer inline-block px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 mt-1">
                Seleccionar archivo
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) procesar(f) }} />
              </label>
              {informe && <p className="text-xs text-gray-400 mt-2">Archivo actual: <strong>{informe.archivo}</strong> — sube otro para reemplazar</p>}
            </>
          )}
        </div>

        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}

        {informe && (
          <>
            {/* Score + métricas clave */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
              <ScoreBadge score={informe.score} />
              {[
                { label: 'Días', value: informe.totalDias, color: 'text-gray-700' },
                { label: 'Platos repetidos', value: informe.alertasPlato.filter(a => a.nivel === 'repetido').length, color: 'text-red-600' },
                { label: 'Platos similares', value: informe.gruposBase.length, color: 'text-purple-600' },
                { label: 'Ensaladas repetidas', value: informe.alertasEnsalada.filter(a => a.nivel === 'repetida').length, color: 'text-orange-600' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-4 text-center shadow-sm">
                  <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-gray-500 mt-1 leading-tight">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-white rounded-xl p-1 border border-gray-200 mb-6 overflow-x-auto">
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTabActiva(t.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${tabActiva === t.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* TAB: RESUMEN */}
            {tabActiva === 'resumen' && (
              <div className="space-y-4">
                {/* Distribución proteína */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-bold text-gray-800 mb-4">Distribución por proteína</h3>
                  <div className="flex flex-wrap gap-3">
                    {informe.distribucionProteina.map(d => (
                      <div key={d.tipo} className={`rounded-xl border px-4 py-3 text-center min-w-[90px] ${PROT_COLOR[d.tipo] || PROT_COLOR.Otro}`}>
                        <div className="text-2xl font-black">{d.veces}</div>
                        <div className="text-xs font-semibold">{d.tipo}</div>
                        <div className="text-[11px] opacity-70">{d.pct}%</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Proteínas con días consecutivos */}
                {informe.alertasProteina.filter(a => a.diasConsecutivos.length > 0).length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
                    <h3 className="font-bold text-orange-800 mb-3">⚠ Proteína repetida días seguidos</h3>
                    <div className="space-y-2">
                      {informe.alertasProteina.filter(a => a.diasConsecutivos.length > 0).map(a => (
                        <div key={a.tipo} className="flex items-center justify-between bg-white rounded-lg border border-orange-200 px-4 py-2">
                          <span className={`text-sm font-semibold px-2 py-0.5 rounded-full border ${PROT_COLOR[a.tipo] || PROT_COLOR.Otro}`}>{a.tipo}</span>
                          <div className="text-sm text-orange-700">
                            {a.diasConsecutivos.map((r, i) => (
                              <span key={i} className="mr-2">Días {r.join('→')}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grupos de platos similares */}
                {informe.gruposBase.length > 0 && (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
                    <h3 className="font-bold text-purple-800 mb-1">🔍 Platos similares detectados</h3>
                    <p className="text-xs text-purple-600 mb-3">Diferentes preparaciones de la misma proteína base — aunque el nombre cambia, el trabajador percibe que come lo mismo.</p>
                    <div className="space-y-3">
                      {informe.gruposBase.map(g => (
                        <div key={g.base} className="bg-white rounded-lg border border-purple-200 p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-purple-800 text-sm">{g.base}</span>
                            <span className="text-[11px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{g.platos.length} preparaciones · {g.vecesTotal} veces total</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mb-1">
                            {g.platos.map(p => (
                              <span key={p} className="text-xs bg-purple-50 border border-purple-200 text-purple-700 px-2 py-0.5 rounded">{p}</span>
                            ))}
                          </div>
                          <div className="text-[11px] text-gray-400">Días: {g.dias.join(', ')}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Acompañamientos top */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-bold text-gray-800 mb-3">Acompañamientos más usados</h3>
                  <div className="space-y-2">
                    {informe.acompsTop.map(a => (
                      <div key={a.nombre} className="flex items-center gap-3">
                        <span className="text-sm text-gray-700 w-48 truncate">{a.nombre}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div className="h-2 rounded-full bg-blue-400" style={{ width: `${(a.veces / (informe.acompsTop[0]?.veces || 1)) * 100}%` }} />
                        </div>
                        <span className="text-sm font-bold text-gray-600 w-6 text-right">{a.veces}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: PLATOS */}
            {tabActiva === 'platos' && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4 text-sm text-gray-500">
                  Gap recomendado para esta minuta: <strong className="text-blue-600">{informe.gapRecomendado} días</strong> ({informe.totalDias} días ÷ {informe.alertasPlato.length} platos distintos)
                </div>
                {['repetido', 'cercano', 'ok'].map(nivel => {
                  const grupo = informe.alertasPlato.filter(a => a.nivel === nivel)
                  if (grupo.length === 0) return null
                  const config = {
                    repetido: { label: '🚨 Repetición problemática', cls: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-700' },
                    cercano:  { label: '⚠ Cercanos — revisar',       cls: 'bg-orange-50 border-orange-200', badge: 'bg-orange-100 text-orange-700' },
                    ok:       { label: '✅ Sin problemas',            cls: 'bg-gray-50 border-gray-200', badge: 'bg-gray-100 text-gray-600' },
                  }[nivel]!
                  return (
                    <div key={nivel} className={`rounded-xl border p-4 ${config.cls}`}>
                      <h3 className="font-bold text-gray-800 mb-3">{config.label} <span className="font-normal text-gray-500">({grupo.length})</span></h3>
                      <div className="space-y-2">
                        {grupo.map(a => (
                          <div key={a.nombre} className="bg-white rounded-lg border border-gray-200 px-4 py-2 flex items-center justify-between flex-wrap gap-2">
                            <div>
                              <span className="text-sm font-medium text-gray-800">{a.nombre}</span>
                              <span className={`ml-2 text-[11px] px-2 py-0.5 rounded-full border ${PROT_COLOR[a.proteina] || PROT_COLOR.Otro}`}>{a.proteina}</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span><strong className="text-gray-800">{a.veces}×</strong></span>
                              {a.veces > 1 && <span>Gap: <strong className={a.nivel === 'repetido' ? 'text-red-600' : a.nivel === 'cercano' ? 'text-orange-500' : 'text-gray-700'}>{a.gapMin}d</strong></span>}
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

            {/* TAB: PROTEÍNAS */}
            {tabActiva === 'proteinas' && (
              <div className="space-y-4">
                {informe.alertasProteina.map(a => (
                  <div key={a.tipo} className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-bold px-3 py-1 rounded-full border ${PROT_COLOR[a.tipo] || PROT_COLOR.Otro}`}>{a.tipo}</span>
                        <span className="text-gray-500 text-sm">{a.veces} apariciones · {a.pct}% del total</span>
                      </div>
                      {a.diasConsecutivos.length > 0 && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-semibold">
                          ⚠ {a.diasConsecutivos.length} racha(s) consecutiva(s)
                        </span>
                      )}
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
                      <div className="h-2 rounded-full bg-blue-400 transition-all" style={{ width: `${a.pct}%` }} />
                    </div>
                    {a.diasConsecutivos.length > 0 && (
                      <div className="text-sm text-orange-700 bg-orange-50 rounded-lg p-3">
                        <strong>Días consecutivos:</strong> {a.diasConsecutivos.map(r => r.join(' → ')).join(' | ')}
                      </div>
                    )}
                    {/* Platos de esta proteína */}
                    <div className="mt-3 flex flex-wrap gap-1">
                      {informe.alertasPlato.filter(p => p.proteina === a.tipo).map(p => (
                        <span key={p.nombre} className={`text-[11px] px-2 py-0.5 rounded border ${p.nivel === 'repetido' ? 'bg-red-50 border-red-200 text-red-700' : p.nivel === 'cercano' ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                          {p.nombre} ({p.veces}×)
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB: ENSALADAS */}
            {tabActiva === 'ensaladas' && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-sm text-gray-500 mb-4">En un ciclo ideal, cada ensalada debería aparecer solo una vez. Las repetidas significan que el trabajador comió la misma ensalada más de una vez en el turno.</p>
                <div className="space-y-2">
                  {informe.alertasEnsalada.map(e => (
                    <div key={e.nombre} className={`flex items-center justify-between px-4 py-2 rounded-lg border ${e.nivel === 'repetida' ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
                      <span className="text-sm text-gray-800">{e.nombre}</span>
                      <div className="flex items-center gap-3 text-xs">
                        {e.nivel === 'repetida' && <span className="text-orange-600 font-bold">⚠ {e.veces}× repetida</span>}
                        {e.nivel === 'ok' && <span className="text-green-600">✅ 1×</span>}
                        <span className="text-gray-400">Días: {e.dias.join(', ')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: POR SEMANA */}
            {tabActiva === 'semanas' && (
              <div className="space-y-6">
                {informe.semanas.map(sem => (
                  <div key={sem.num} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="bg-gray-800 text-white px-4 py-2 text-sm font-bold">
                      Semana {sem.num} · {sem.dias[0]?.fecha} al {sem.dias[sem.dias.length-1]?.fecha}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="p-2 text-left w-20 text-gray-500">Servicio</th>
                            {sem.dias.map(d => (
                              <th key={d.dia} className="p-2 text-center text-gray-600">
                                <div className="font-bold">{d.diaSemana}</div>
                                <div className="text-gray-400">{d.fecha}</div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(['Almuerzo', 'Cena'] as const).map(tipo => (
                            <tr key={tipo} className={tipo === 'Almuerzo' ? 'bg-blue-50' : 'bg-indigo-50'}>
                              <td className="p-2 font-bold text-[10px] uppercase text-gray-600">{tipo}</td>
                              {sem.dias.map(dia => {
                                const svc = dia.servicios.find(s => s.tipo === tipo)
                                const proteina = svc ? clasificarProteina(svc.platoPrincipal) : ''
                                const alerta = svc ? informe.alertasPlato.find(a => a.nombre === svc.platoPrincipal)?.nivel : 'ok'
                                return (
                                  <td key={dia.dia} className="p-2 border border-white text-center">
                                    {svc ? (
                                      <>
                                        <div className={`text-[10px] font-semibold leading-tight px-1 py-0.5 rounded ${alerta === 'repetido' ? 'bg-red-100 text-red-700' : alerta === 'cercano' ? 'bg-orange-100 text-orange-700' : 'text-gray-800'}`}>
                                          {svc.platoPrincipal}
                                        </div>
                                        <div className={`text-[9px] mt-0.5 px-1 py-0.5 rounded-full border inline-block ${PROT_COLOR[proteina] || PROT_COLOR.Otro}`}>{proteina}</div>
                                        <div className="text-[9px] text-gray-400 mt-0.5">{svc.ensalada}</div>
                                      </>
                                    ) : <span className="text-gray-300">—</span>}
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
          </>
        )}
      </main>
    </div>
  )
}
