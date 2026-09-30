import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Minuta Casino de Faena',
  description: 'Planificación de minuta quincenal para casino de faena',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  )
}
