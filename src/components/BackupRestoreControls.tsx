import { useRef, type ChangeEvent } from 'react'
import { useData } from '../hooks/DataContext'
import { todayStr } from '../lib/format'
import { DownloadIcon, UploadIcon } from './icons'
import type { AppData } from '../types'

function isAppDataShape(value: unknown): value is Partial<AppData> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export default function BackupRestoreControls() {
  const { data, replaceData } = useData()
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleBackup() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `finance-tracker-backup-${todayStr()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleRestoreClick() {
    fileInputRef.current?.click()
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      let parsed: unknown
      try {
        parsed = JSON.parse(String(reader.result))
      } catch {
        alert("Could not read that file — make sure it's a valid backup .json file.")
        return
      }
      if (!isAppDataShape(parsed) || !Array.isArray(parsed.categories) || !Array.isArray(parsed.transactions)) {
        alert("That file doesn't look like a valid Finance Tracker backup.")
        return
      }
      if (!confirm('This will replace all current data with the backup file. Continue?')) return
      replaceData(parsed as AppData)
    }
    reader.readAsText(file)
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleBackup}
        title="Download a backup of all your data"
        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-panel-hover hover:text-text"
      >
        <DownloadIcon className="h-4 w-4" />
        <span className="hidden sm:inline">Backup</span>
      </button>
      <button
        onClick={handleRestoreClick}
        title="Restore data from a backup file"
        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-panel-hover hover:text-text"
      >
        <UploadIcon className="h-4 w-4" />
        <span className="hidden sm:inline">Restore</span>
      </button>
      <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleFileChange} />
    </div>
  )
}
