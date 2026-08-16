import { MODELS_BY_PROVIDER } from '@shared/models'

interface ModelSelectProps {
  provider: string
  value: string
  onChange: (model: string) => void
  disabled?: boolean
  id?: string
}

export default function ModelSelect({ provider, value, onChange, disabled, id }: ModelSelectProps): JSX.Element {
  const models = MODELS_BY_PROVIDER[provider] ?? []

  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled || models.length === 0}>
      {models.length === 0 && <option value="">No models available for this provider yet</option>}
      {models.map((m) => (
        <option key={m.id} value={m.id}>
          {m.label}
        </option>
      ))}
    </select>
  )
}
