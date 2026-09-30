'use client'

import { useState, useCallback } from 'react'
import * as XLSX from 'xlsx'

interface ServicioParsed {
  tipo: string
  ensalada: string
  acompañamiento: string
  platoPrincipal: string
  estado: string
}

interface DiaParsed {
  dia: number
  fecha: string
  diaSemana: string
  servicios: ServicioParsed[]
}

interface Analisis {
  totalServicios: number
  confirmados: number
  pendientes: number
  diasCiclo: number
  platosUnicos: number
  diasMinimoRecomendado: number  // calculado automáticamente
  platos: { nombre: string; veces: number; dias: number[]; gap: number; estado: 'ok' | 'cercano' | 'repetido' }[]
  ensaladas: { nombre: string; veces: number; repetida: boolean }[]
  acomps: { nombre: string; veces: number }[]
  distribucionProteina: Record<string, number>
}

function clasificarTipo(nombre: string): string {
  const n = nombre.toLowerCase()
  if (n.includes('vacuno') || n.includes('carne') || n.includes('asado') || n.includes('estofado') || n.includes('mechada') || n.includes('albóndiga') || n.includes('tortica') || n.includes('chopsui de v')) return 'vacuno'
  if (n.includes('cerdo') || n.includes('chuleta') || n.includes('medalla')) return 'cerdo'
  if (n.includes('pollo')) return 'pollo'
  if (n.includes('spaghetti') || n.includes('mostaccioli') || n.includes('espirales') || n.includes('pasta')) return 'pasta'
  if (n.includes('lentejas') || n.includes('legumbre')) return 'legumbre'
  return 'otro'
}

function calcularGapMinimo(posiciones: number[]): number {
  if (posiciones.length < 2) return Infinity
  let min = Infinity
  for (let i = 1; i < posiciones.length; i++) min = Math.min(min, posiciones[i] - posiciones[i - 1])
  return min
}

function analizarDias(dias: DiaParsed[]): Analisis {
  const totalServicios = dias.reduce((a, d) => a + d.servicios.length, 0)
  const confirmados = dias.reduce((a, d) => a + d.servicios.filter(s => s.estado === 'Confirmado').length, 0)
  const diasCiclo = dias.length

  const mapaPlatos = new Map<string, { veces: number; dias: number[] }>()
  const mapaEnsaladas = new Map<string, number>()
  const mapaAcomps = new Map<string, number>()

  dias.forEach((dia, di) => {
    dia.servicios.forEach(svc => {
      if (svc.platoPrincipal && svc.platoPrincipal !== 'Por Definir') {
        const entry = mapaPlatos.get(svc.platoPrincipal) || { veces: 0, dias: [] }
        entry.veces++
        entry.dias.push(di + 1)
        mapaPlatos.set(svc.platoPrincipal, entry)
      }
      if (svc.ensalada && svc.ensalada !== 'Por Definir') {
        mapaEnsaladas.set(svc.ensalada, (mapaEnsaladas.get(svc.ensalada) || 0) + 1)
      }
      if (svc.acompañamiento && svc.acompañamiento !== 'Por Definir') {
        mapaAcomps.set(svc.acompañamiento, (mapaAcomps.get(svc.acompañamiento) || 0) + 1)
      }
    })
  })

  const platosUnicos = mapaPlatos.size

  // Cálculo automático: el mínimo recomendado es diasCiclo / platosUnicos redondeado
  // Con un mínimo de 3 y máximo de 7 para ser práctico en faena
  const diasMinimoRecomendado = Math.min(7, Math.max(3, Math.floor(diasCiclo / platosUnicos)))

  const platosRaw = Array.from(mapaPlatos.entries()).map(([nombre, d]) => {
    const gap = calcularGapMinimo(d.dias)
    const estado: 'ok' | 'cercano' | 'repetido' =
      d.veces === 1 ? 'ok'
      : gap < diasMinimoRecomendado ? 'repetido'
      : gap < diasMinimoRecomendado + 2 ? 'cercano'
      : 'ok'
    return { nombre, ...d, gap: gap === Infinity ? 0 : gap, estado }
  }).sort((a, b) => b.veces - a.veces)

  const distribucionProteina: Record<string, number> = {}
  platosRaw.forEach(p => {
    const t = clasificarTipo(p.nombre)
    distribucionProteina[t] = (distribucionProteina[t] || 0) + p.veces
  })

  const ensaladasRaw = Array.from(mapaEnsaladas.entries())
    .map(([nombre, veces]) => ({ nombre, veces, repetida: veces > 1 }))
    .sort((a, b) => b.veces - a.veces)

  return {
    totalServicios, confirmados, pendientes: totalServicios - confirmados,
    diasCiclo, platosUnicos, diasMinimoRecomendado,
    platos: platosRaw,
    ensaladas: ensaladasRaw,
    acomps: Array.from(mapaAcomps.entries()).map(([nombre, veces]) => ({ nombre, veces })).sort((a, b) => b.veces - a.veces),
    distribucionProteina,
  }
}

function parsearExcel(file: File): Promise<DiaParsed[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })

        // Buscar hoja de minuta (puede ser "Minuta 14 Días" u otro nombre)
        const hojaMinuta = wb.SheetNames.find(n =>
          n.toLowerCase().includes('minuta') || n.toLowerCase().includes('días') || n.toLowerCase().includes('dias')
        ) || wb.SheetNames[0]

        const ws = wb.Sheets[hojaMinuta]
        const rows: (string | number)[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

        const dias: DiaParsed[] = []
        let diaActual: DiaParsed | null = null

        for (const row of rows) {
          const [col0, col1, col2, col3, col4, col5, col6] = row.map(c => String(c || '').trim())

          // Detectar fila de día (primera columna es número)
          const numDia = parseInt(col0)
          if (!isNaN(numDia) && numDia > 0 && numDia <= 31) {
            diaActual = { dia: numDia, fecha: col1, diaSemana: col2, servicios: [] }
            dias.push(diaActual)

            if (col3) {
              diaActual.servicios.push({
                tipo: col3, ensalada: col4, acompañamiento: col5, platoPrincipal: col6, estado: String(row[7] || 'Por Confirmar').trim()
              })
            }
          } else if (diaActual && col3 && (col3 === 'Almuerzo' || col3 === 'Cena')) {
            diaActual.servicios.push({
              tipo: col3, ensalada: col4, acompañamiento: col5, platoPrincipal: col6, estado: String(row[7] || 'Por Confirmar').trim()
            })
          }
        }

        resolve(dias.filter(d => d.servicios.length > 0))
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

const TIPO_COLOR: Record<string, string> = {
  vacuno: 'bg-red-100 text-red-700', cerdo: 'bg-pink-100 text-pink-700',
  pollo: 'bg-yellow-100 text-yellow-700', pasta: 'bg-orange-100 text-orange-700',
  legumbre: 'bg-green-100 text-green-700', otro: 'bg-gray-100 text-gray-600',
}

export default function SubirPage() {
  const [analisis, setAnalisis] = useState<Analisis | null>(null)
  const [archivo, setArchivo] = useState<string>('')
  const [error, setError] = useState('')
  const [arrastrando, setArrastrando] = useState(false)

  const procesar = async (file: File) => {
    setError('')
    try {
      const d = await parsearExcel(file)
      if (d.length === 0) { setError('No se encontraron días en el archivo. Verifica el formato.'); return }
      setAnalisis(analizarDias(d))
      setArchivo(file.name)
    } catch {
      setError('Error leyendo el archivo. Asegúrate que sea un .xlsx o .xls válido.')
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setArrastrando(false)
    const file = e.dataTransfer.files[0]
    if (file) procesar(file)
  }, [])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) procesar(file)
  }

  const totalPlatos = analisis ? Object.values(analisis.distribucionProteina).reduce((a, b) => a + b, 0) : 0

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-900 text-white px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Subir Minuta</h1>
            <p className="text-gray-400 text-sm">Analiza cualquier minuta Excel automáticamente</p>
          </div>
          <a href="/" className="text-gray-400 hover:text-white text-sm">← Volver a la minuta</a>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Upload zone */}
        <div className={`border-2 border-dashed rounded-xl p-10 text-center mb-6 transition-colors ${arrastrando ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'}`}
          onDrop={onDrop} onDragOver={e => { e.preventDefault(); setArrastrando(true) }} onDragLeave={() => setArrastrando(false)}>
          <div className="text-4xl mb-3">📊</div>
          <p className="text-gray-600 font-medium mb-1">Arrastra tu Excel aquí</p>
          <p className="text-gray-400 text-sm mb-4">o haz click para seleccionar</p>
          <label className="cursor-pointer px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 inline-block">
            Seleccionar archivo
            <input type="file" accept=".xlsx,.xls" onChange={onFileChange} className="hidden" />
          </label>
          <p className="text-gray-400 text-xs mt-3">Soporta el formato del Excel "Minuta_Interactiva_14_Dias"</p>
        </div>

        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}

        {analisis && (
          <>
            {/* Archivo + cálculo automático */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-800">📂 {archivo}</p>
                  <p className="text-xs text-gray-500">{analisis.diasCiclo} días · {analisis.totalServicios} servicios · {analisis.platosUnicos} platos distintos</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-center">
                  <p className="text-[11px] text-blue-600 uppercase font-semibold">Gap mínimo calculado automáticamente</p>
                  <p className="text-2xl font-bold text-blue-700">{analisis.diasMinimoRecomendado} días</p>
                  <p className="text-[10px] text-blue-500">{analisis.diasCiclo} días ÷ {analisis.platosUnicos} platos</p>
                </div>
              </div>
            </div>

            {/* Stats generales */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Total servicios', value: analisis.totalServicios, color: 'text-gray-700' },
                { label: 'Confirmados', value: analisis.confirmados, color: 'text-green-700' },
                { label: 'Pendientes', value: analisis.pendientes, color: 'text-yellow-700' },
                { label: 'Problemas ⚠', value: analisis.platos.filter(p => p.estado !== 'ok').length, color: 'text-red-700' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Alertas automáticas */}
            {analisis.platos.some(p => p.estado !== 'ok') && (
              <div className="mb-6 space-y-2">
                {analisis.platos.filter(p => p.estado === 'repetido').length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <h3 className="font-bold text-red-800 mb-3">🚨 Repetidos muy cerca — gap menor a {analisis.diasMinimoRecomendado} días</h3>
                    <div className="space-y-2">
                      {analisis.platos.filter(p => p.estado === 'repetido').map(r => (
                        <div key={r.nombre} className="flex items-center justify-between bg-white rounded-lg border border-red-200 px-3 py-2">
                          <span className="text-sm font-medium text-gray-800">{r.nombre}</span>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-red-600 font-bold">Gap: {r.gap} días</span>
                            <span className="text-gray-400">Días: {r.dias.join(', ')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {analisis.platos.filter(p => p.estado === 'cercano').length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                    <h3 className="font-bold text-orange-800 mb-3">⚠ Cercanos — revisar</h3>
                    <div className="space-y-2">
                      {analisis.platos.filter(p => p.estado === 'cercano').map(r => (
                        <div key={r.nombre} className="flex items-center justify-between bg-white rounded-lg border border-orange-200 px-3 py-2">
                          <span className="text-sm font-medium text-gray-800">{r.nombre}</span>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-orange-600 font-bold">Gap: {r.gap} días</span>
                            <span className="text-gray-400">Días: {r.dias.join(', ')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Distribución proteína */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
              <h3 className="font-bold text-gray-700 mb-3">Distribución por tipo de proteína</h3>
              <div className="flex flex-wrap gap-3">
                {Object.entries(analisis.distribucionProteina).sort((a, b) => b[1] - a[1]).map(([tipo, count]) => (
                  <div key={tipo} className={`rounded-xl border px-4 py-3 text-center min-w-[90px] ${TIPO_COLOR[tipo]}`}>
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-xs capitalize">{tipo}</div>
                    <div className="text-[10px] opacity-70">{Math.round(count / totalPlatos * 100)}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tablas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Platos */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="font-bold text-gray-700 mb-3">Platos principales <span className="text-gray-400 font-normal text-sm">({analisis.platos.length})</span></h3>
                <div className="space-y-2">
                  {analisis.platos.map(p => (
                    <div key={p.nombre} className={`p-2 rounded-lg border text-sm ${p.estado === 'repetido' ? 'border-red-200 bg-red-50' : p.estado === 'cercano' ? 'border-orange-200 bg-orange-50' : 'border-gray-100'}`}>
                      <div className="flex justify-between items-start">
                        <span className="font-medium text-gray-800 text-xs leading-tight">{p.nombre}</span>
                        <span className={`font-bold text-sm ml-2 shrink-0 ${p.estado === 'repetido' ? 'text-red-600' : p.estado === 'cercano' ? 'text-orange-500' : 'text-gray-500'}`}>{p.veces}×</span>
                      </div>
                      <div className="mt-1 flex gap-2 text-[10px] text-gray-400 flex-wrap">
                        <span className={`px-1.5 py-0.5 rounded-full ${TIPO_COLOR[clasificarTipo(p.nombre)]}`}>{clasificarTipo(p.nombre)}</span>
                        {p.veces > 1 && <span>Gap: {p.gap}d</span>}
                        <span>Días: {p.dias.join(', ')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Acompañamientos */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="font-bold text-gray-700 mb-3">Acompañamientos <span className="text-gray-400 font-normal text-sm">({analisis.acomps.length})</span></h3>
                <div className="space-y-1.5">
                  {analisis.acomps.map(a => (
                    <div key={a.nombre} className="flex items-center justify-between p-2 rounded-lg border border-gray-100">
                      <span className="text-xs text-gray-700">{a.nombre}</span>
                      <div className="flex items-center gap-2 ml-2">
                        <div className="w-16 bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-blue-400" style={{ width: `${(a.veces / (analisis.acomps[0]?.veces || 1)) * 100}%` }} />
                        </div>
                        <span className="text-xs font-bold text-gray-600 w-5">{a.veces}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ensaladas */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="font-bold text-gray-700 mb-3">Ensaladas <span className="text-gray-400 font-normal text-sm">({analisis.ensaladas.length})</span></h3>
                <div className="space-y-1.5">
                  {analisis.ensaladas.map(e => (
                    <div key={e.nombre} className={`flex items-center justify-between p-2 rounded-lg border ${e.veces > 1 ? 'border-red-200 bg-red-50' : 'border-gray-100'}`}>
                      <span className="text-xs text-gray-700">{e.nombre}</span>
                      <span className={`text-xs font-bold ml-2 ${e.veces > 1 ? 'text-red-600' : 'text-gray-600'}`}>{e.veces}×</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
