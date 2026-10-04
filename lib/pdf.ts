import { DiaMinuta, Servicio } from '@/types/minuta'
import { formatFecha } from '@/lib/fecha'
import { clasificarProteina, PROTEINA_LABEL, TipoProteina } from '@/lib/proteina'

type RGB = [number, number, number]

// Colores de impresión (más oscuros que los de pantalla para que se lean en papel blanco)
const PROT_RGB: Record<TipoProteina, RGB> = {
  vacuno: [220, 38, 38], cerdo: [219, 39, 119], pollo: [217, 119, 6], pescado: [2, 132, 199],
  pasta: [124, 58, 237], legumbre: [5, 150, 105], vegetariano: [101, 163, 13], otro: [100, 116, 139],
}
const SERVICIO_RGB: Record<string, { fondo: RGB; texto: RGB }> = {
  Almuerzo: { fondo: [254, 243, 199], texto: [146, 64, 14] },
  Cena: { fondo: [224, 231, 255], texto: [55, 48, 163] },
}
const C = {
  titulo: [15, 23, 42] as RGB, texto: [30, 41, 59] as RGB, gris: [100, 116, 139] as RGB, borde: [203, 213, 225] as RGB,
  ensalada: [21, 128, 61] as RGB, postre: [180, 83, 9] as RGB, saludable: [13, 148, 136] as RGB, domingo: [234, 88, 12] as RGB,
}

const SIN = 'Por Definir'
const definido = (v?: string) => !!v && v.trim() !== '' && v !== SIN
// Helvetica de jsPDF solo cubre Latin-1: un emoji u otro carácter fuera de rango rompe toda la línea ("Ø=ÝW B o w l")
const limpio = (s?: string) => (s || '').replace(/[^\x20-\x7E\xA0-\xFF]/g, '').replace(/\s+/g, ' ').trim()

export async function construirPDF(dias: DiaMinuta[], turno: string, casino: string, fechaInicio: string) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const W = 297, H = 210, M = 10
  const COL0 = 22
  const semanas: DiaMinuta[][] = []
  for (let i = 0; i < dias.length; i += 7) semanas.push(dias.slice(i, i + 7))
  const generado = new Date().toLocaleDateString('es-CL')

  // Dibuja el contenido de una celda de servicio con colores; devuelve la altura usada
  const dibujarServicio = (s: Servicio | undefined, x: number, y: number, w: number, dibujar: boolean, k = 1): number => {
    let cy = y
    const linea = (txt: string, size: number, color: RGB, estilo: 'normal' | 'bold' | 'italic', sangria = 0) => {
      doc.setFont('helvetica', estilo); doc.setFontSize(size * k); doc.setTextColor(...color)
      const lineas = doc.splitTextToSize(txt, w - sangria) as string[]
      const alto = size * k * 0.3528 * 1.18
      lineas.forEach(l => { cy += alto; if (dibujar) doc.text(l, x + sangria, cy) })
      cy += 0.6 * k
    }
    if (!s || !definido(s.platoPrincipal)) { linea('Por definir', 8, C.gris, 'italic'); return cy - y }
    const prot = clasificarProteina(s.platoPrincipal)
    // Etiqueta de proteína
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6 * k)
    const etiqueta = PROTEINA_LABEL[prot].toUpperCase()
    const ew = doc.getTextWidth(etiqueta) + 3
    if (dibujar) { doc.setFillColor(...PROT_RGB[prot]); doc.roundedRect(x, cy + 0.6, ew, 3.6 * k, 0.8, 0.8, 'F'); doc.setTextColor(255, 255, 255); doc.text(etiqueta, x + 1.5, cy + 0.6 + 2.7 * k) }
    cy += 1.4 + 3.6 * k
    linea(limpio(s.platoPrincipal), 8.5, C.titulo, 'bold')
    if (definido(s.acompañamiento)) linea('+ ' + limpio(s.acompañamiento), 7.5, C.texto, 'normal')
    if (definido(s.ensalada)) linea('Ensalada: ' + limpio(s.ensalada), 7, C.ensalada, 'normal')
    if (definido(s.postre)) linea('Postre: ' + limpio(s.postre), 7, C.postre, 'normal')
    if (definido(s.opcionHipo)) linea('Opción saludable: ' + limpio(s.opcionHipo), 6.5, C.saludable, 'italic')
    return cy - y
  }

  semanas.forEach((semana, si) => {
    if (si > 0) doc.addPage()

    // Encabezado
    doc.setFillColor(15, 23, 42); doc.rect(0, 0, W, 20, 'F')
    doc.setFillColor(16, 185, 129); doc.rect(0, 20, W, 1.2, 'F')
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(15)
    doc.text(limpio(`Minuta ${casino}`), M, 10)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(203, 213, 225)
    doc.text(`Turno ${turno}  ·  Semana ${si + 1} de ${semanas.length}  ·  ${formatFecha(semana[0]?.fecha)} al ${formatFecha(semana[semana.length - 1]?.fecha)}`, M, 16)
    doc.setFontSize(8)
    doc.text(`Inicio de ciclo: ${formatFecha(fechaInicio, 'dd-mm-yyyy')}`, W - M, 10, { align: 'right' })

    const anchoDia = (W - 2 * M - COL0) / 7
    const altoFila = (H - 28 - 12 - 16) / 2 // página menos encabezado, cabecera de tabla y leyenda
    const tipos = ['Almuerzo', 'Cena']

    // Escala de letra: la mayor (hasta 1.5×) con la que la celda más cargada de la semana cabe en su fila
    const altoMax = (k: number) => Math.max(...semana.flatMap(d => tipos.map(t => dibujarServicio(d.servicios.find(x => x.tipo === t), 0, 0, anchoDia - 5, false, k))))
    let k = 1.5
    while (k > 0.75 && altoMax(k) > altoFila - 4) k -= 0.05

    autoTable(doc, {
      startY: 26,
      margin: { left: M, right: M },
      head: [['', ...semana.map(d => `${d.diaSemana}\n${formatFecha(d.fecha)}`)]],
      body: tipos.map(t => [t.toUpperCase(), ...semana.map(() => '')]),
      theme: 'grid',
      styles: { lineColor: C.borde, lineWidth: 0.25, cellPadding: 2.5, valign: 'top', minCellHeight: altoFila },
      headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold', halign: 'center', valign: 'middle', fontSize: 8.5, minCellHeight: 12 },
      columnStyles: { 0: { cellWidth: COL0, halign: 'center', valign: 'middle', fontStyle: 'bold', fontSize: 8 }, ...Object.fromEntries(semana.map((_, i) => [i + 1, { cellWidth: anchoDia }])) },
      didParseCell: data => {
        if (data.section === 'head' && data.column.index > 0 && semana[data.column.index - 1]?.diaSemana === 'Domingo') data.cell.styles.fillColor = C.domingo
        if (data.section === 'body') {
          const t = tipos[data.row.index]
          if (data.column.index === 0) { data.cell.styles.fillColor = SERVICIO_RGB[t].fondo; data.cell.styles.textColor = SERVICIO_RGB[t].texto }
          else data.cell.styles.fillColor = data.row.index % 2 === 0 ? [255, 255, 255] : [248, 250, 252]
        }
      },
      didDrawCell: data => {
        if (data.section !== 'body' || data.column.index === 0) return
        const dia = semana[data.column.index - 1]
        const s = dia?.servicios.find(x => x.tipo === tipos[data.row.index])
        // Franja de color de la proteína a la izquierda de la celda
        if (s && definido(s.platoPrincipal)) {
          doc.setFillColor(...PROT_RGB[clasificarProteina(s.platoPrincipal)])
          doc.rect(data.cell.x, data.cell.y, 1.4, data.cell.height, 'F')
        }
        dibujarServicio(s, data.cell.x + 3.2, data.cell.y + 1.2, data.cell.width - 5, true, k)
      },
    })

    // Leyenda + pie
    const yl = H - 9
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...C.gris)
    let lx = M
    doc.text('Proteína:', lx, yl); lx += 13
    ;(['vacuno', 'cerdo', 'pollo', 'pescado', 'pasta', 'legumbre', 'vegetariano'] as TipoProteina[]).forEach(p => {
      doc.setFillColor(...PROT_RGB[p]); doc.roundedRect(lx, yl - 2.6, 3, 3, 0.5, 0.5, 'F')
      doc.setTextColor(...C.texto); doc.text(PROTEINA_LABEL[p], lx + 4, yl); lx += doc.getTextWidth(PROTEINA_LABEL[p]) + 9
    })
    lx += 4
    ;([['Ensalada', C.ensalada], ['Postre', C.postre], ['Opción saludable', C.saludable]] as [string, RGB][]).forEach(([l, c]) => {
      doc.setTextColor(...c); doc.text(l, lx, yl); lx += doc.getTextWidth(l) + 6
    })
    doc.setTextColor(...C.gris)
    doc.text(`Generado ${generado}  ·  Página ${si + 1} de ${semanas.length}`, W - M, yl, { align: 'right' })
  })

  return doc
}

export async function generarPDF(dias: DiaMinuta[], turno: string, casino: string, fechaInicio: string) {
  const doc = await construirPDF(dias, turno, casino, fechaInicio)
  doc.save(`Minuta_${turno}_${formatFecha(fechaInicio, 'dd-mm-yyyy')}.pdf`)
}
