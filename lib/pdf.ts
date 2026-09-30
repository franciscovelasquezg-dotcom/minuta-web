import { DiaMinuta } from '@/types/minuta'

export async function generarPDF(dias: DiaMinuta[], turno: string, casino: string, fechaInicio: string) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  const SEMANA_SIZE = 7
  const semanas: DiaMinuta[][] = []
  for (let i = 0; i < dias.length; i += SEMANA_SIZE) semanas.push(dias.slice(i, i + SEMANA_SIZE))

  semanas.forEach((semana, si) => {
    if (si > 0) doc.addPage()

    // Header
    doc.setFillColor(31, 41, 55)
    doc.rect(0, 0, 297, 18, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text(`Minuta ${casino} — Turno ${turno}`, 10, 11)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Semana ${si + 1} · ${semana[0]?.fecha} al ${semana[semana.length - 1]?.fecha} · Inicio: ${fechaInicio}`, 10, 16)

    // Tabla Almuerzo
    const headCols = ['', ...semana.map(d => `${d.diaSemana}\n${d.fecha}`)]

    const almuerzos = semana.map(d => {
      const s = d.servicios.find(sv => sv.tipo === 'Almuerzo')
      return s ? `${s.platoPrincipal}\n${s.acompañamiento}\n${s.ensalada}${s.postre ? '\n' + s.postre : ''}` : '—'
    })
    const cenas = semana.map(d => {
      const s = d.servicios.find(sv => sv.tipo === 'Cena')
      return s ? `${s.platoPrincipal}\n${s.acompañamiento}\n${s.ensalada}${s.postre ? '\n' + s.postre : ''}` : '—'
    })

    autoTable(doc, {
      startY: 22,
      head: [headCols],
      body: [
        ['ALMUERZO', ...almuerzos],
        ['CENA', ...cenas],
      ],
      styles: { fontSize: 7.5, cellPadding: 3, valign: 'top', lineColor: [200, 200, 200], lineWidth: 0.3 },
      headStyles: { fillColor: [55, 65, 81], textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 8 },
      columnStyles: { 0: { fillColor: [243, 244, 246], fontStyle: 'bold', textColor: [55, 65, 81], halign: 'center', cellWidth: 20 } },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      bodyStyles: { textColor: [31, 41, 55] },
    })
  })

  doc.save(`Minuta_${turno}_${fechaInicio.replace(/\//g, '-')}.pdf`)
}
