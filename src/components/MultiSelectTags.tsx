interface MultiSelectTagsProps {
  options: string[]
  selected: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  disabled?: boolean
}

export default function MultiSelectTags({
  options,
  selected,
  onChange,
  placeholder,
  disabled
}: MultiSelectTagsProps): JSX.Element {
  const available = options.filter((o) => !selected.includes(o))

  return (
    <div className="tag-select">
      <div className="tag-list">
        {selected.length === 0 && <span className="muted small">Any</span>}
        {selected.map((s) => (
          <span key={s} className="tag-chip">
            {s}
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(selected.filter((x) => x !== s))}
              aria-label={`Remove ${s}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      {available.length > 0 && (
        <select
          value=""
          disabled={disabled}
          onChange={(e) => {
            if (e.target.value) onChange([...selected, e.target.value])
          }}
        >
          <option value="" disabled>
            {placeholder ?? 'Add…'}
          </option>
          {available.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
