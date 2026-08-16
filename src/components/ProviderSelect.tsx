import { PROVIDERS } from '@shared/providers'

interface ProviderSelectProps {
  value: string
  onChange: (provider: string) => void
  disabled?: boolean
  id?: string
}

export default function ProviderSelect({ value, onChange, disabled, id }: ProviderSelectProps): JSX.Element {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
      {PROVIDERS.map((p) => (
        <option key={p.id} value={p.id} disabled={!p.available}>
          {p.label}
        </option>
      ))}
    </select>
  )
}
