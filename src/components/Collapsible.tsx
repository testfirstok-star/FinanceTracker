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
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 font-medium text-text">
          <span className={`inline-block transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
          {title}
        </span>
        {right}
      </button>
      {open && <div className="border-t border-line px-4 py-3">{children}</div>}
    </div>
  )
}
