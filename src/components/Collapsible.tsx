import { useState, type ReactNode } from 'react'

export default function Collapsible({
  title,
  defaultOpen = false,
  right,
  children,
}: {
  title: ReactNode
  defaultOpen?: boolean
  right?: ReactNode
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-lg border border-line">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <button type="button" onClick={() => setOpen((o) => !o)} className="section-label flex flex-1 items-center gap-2 text-left">
          <span className={`inline-block shrink-0 normal-case transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
          {title}
        </button>
        {right}
      </div>
      {open && <div className="border-t border-line px-4 py-3">{children}</div>}
    </div>
  )
}
