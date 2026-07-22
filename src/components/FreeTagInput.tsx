import { useState } from 'react'

interface FreeTagInputProps {
  values: string[]
  onChange: (values: string[]) => void
  disabled?: boolean
  placeholder?: string
}

export default function FreeTagInput({ values, onChange, disabled, placeholder }: FreeTagInputProps): JSX.Element {
  const [draft, setDraft] = useState('')

  function commit(): void {
    const v = draft.trim()
    if (v && !values.includes(v)) onChange([...values, v])
    setDraft('')
  }

  return (
    <div className="tag-select">
      <div className="tag-list">
        {values.length === 0 && <span className="muted small">No options yet</span>}
        {values.map((v) => (
          <span key={v} className="tag-chip">
            {v}
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(values.filter((x) => x !== v))}
              aria-label={`Remove ${v}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        value={draft}
        placeholder={placeholder ?? 'Type an option and press Enter'}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
          }
        }}
        onBlur={commit}
      />
    </div>
  )
}
