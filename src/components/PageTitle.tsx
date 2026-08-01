import type { ReactNode } from 'react'

export default function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="font-display text-3xl font-semibold text-text">{children}</h1>
}
