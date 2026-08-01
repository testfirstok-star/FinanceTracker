import type { ReactNode } from 'react'

export default function Card({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-panel p-4 shadow-sm">
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between">
          {title && <h2 className="font-display text-base font-semibold text-text">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
