import { Recepcion, estadoItem, diferencia, resumir, tempOk, RANGO } from '@/lib/recepcion'

// Helvetica de jsPDF solo cubre Latin-1: se quitan emojis y otros símbolos
const limpio = (s?: string) => (s || '').replace(/[^\x20-\x7E\xA0-\xFF]/g, '').replace(/\s+/g, ' ').trim()

const TXT_EST = { sin_contar: 'Sin contar', ok: 'Completo', falta: 'FALTA', sobra: 'SOBRA' }

export async function construirPDFRecepcion(r: Recepcion): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const M = 14
  const s = resumir(r)

  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(15, 23, 42)
  doc.text('Recepcion de camion', M, 18)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(71, 85, 105)
  doc.text(`Fecha: ${r.fecha} ${r.hora}    Estado: ${r.estado.toUpperCase()}`, M, 25)
  doc.text(`Proveedor: ${limpio(r.proveedor) || '-'}    Guia: ${limpio(r.guia) || '-'}`, M, 31)
  doc.text(`Recibe: ${limpio(r.responsable) || '-'}`, M, 37)

  const problemas = s.faltas + s.sobras + s.tempsFuera
  doc.setFont('helvetica', 'bold')
  if (problemas > 0) doc.setTextColor(185, 28, 28); else doc.setTextColor(21, 128, 61)
  doc.text(problemas > 0 ? `Con observaciones: ${s.faltas} faltas, ${s.sobras} sobras, ${s.tempsFuera} temperaturas fuera de rango` : 'Recepcion conforme', M, 44)

  autoTable(doc, {
    startY: 49,
    head: [['Producto', 'Esperado', 'Llego', 'Dif.', 'Estado', 'Nota']],
    body: r.items.map(i => [
      limpio(i.producto), `${i.esperado} ${i.unidad}`, i.recibido === null ? '-' : `${i.recibido} ${i.unidad}`,
      i.recibido === null ? '-' : String(diferencia(i)), TXT_EST[estadoItem(i)], limpio(i.nota),
    ]),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [15, 23, 42] },
    didParseCell: d => {
      if (d.section === 'body' && d.column.index === 4) {
        const v = String(d.cell.raw)
        if (v === 'FALTA') d.cell.styles.textColor = [185, 28, 28]
        else if (v === 'SOBRA') d.cell.styles.textColor = [180, 83, 9]
      }
    },
  })

  if (r.temps.length) {
    // @ts-expect-error lastAutoTable lo agrega el plugin
    const y: number = doc.lastAutoTable.finalY + 8
    autoTable(doc, {
      startY: y,
      head: [['Punto de control', 'Tipo', 'Rango', 'Temp.', 'Hora', 'Resultado']],
      body: r.temps.map(t => [limpio(t.etiqueta), t.categoria, RANGO[t.categoria].texto.replace('°', ''), `${t.valor} C`, t.hora, tempOk(t.categoria, t.valor) ? 'OK' : 'FUERA DE RANGO']),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42] },
      didParseCell: d => {
        if (d.section === 'body' && d.column.index === 5 && String(d.cell.raw) !== 'OK') d.cell.styles.textColor = [185, 28, 28]
      },
    })
  }

  // @ts-expect-error lastAutoTable lo agrega el plugin
  let y: number = doc.lastAutoTable.finalY + 10
  if (r.obs) {
    doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42); doc.text('Observaciones', M, y)
    doc.setFont('helvetica', 'normal'); doc.setTextColor(71, 85, 105)
    const lineas = doc.splitTextToSize(limpio(r.obs), 180)
    doc.text(lineas, M, y + 6)
    y += 8 + lineas.length * 5
  }
  if (y > 255) { doc.addPage(); y = 20 }
  doc.setDrawColor(148, 163, 184)
  doc.line(M, y + 22, M + 70, y + 22); doc.line(M + 100, y + 22, M + 170, y + 22)
  doc.setFontSize(9); doc.setTextColor(100, 116, 139)
  doc.text('Firma quien recibe', M, y + 27); doc.text('Firma conductor / proveedor', M + 100, y + 27)

  doc.save(`recepcion_${r.fecha}_${limpio(r.proveedor).replace(/\s+/g, '_') || 'sin_proveedor'}.pdf`)
}
