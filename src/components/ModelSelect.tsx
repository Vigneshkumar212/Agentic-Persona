import { useEffect, useState } from 'react'
import type { ModelInfo } from '@shared/models'

interface ModelSelectProps {
  value: string
  onChange: (model: string) => void
  disabled?: boolean
  id?: string
}

export default function ModelSelect({ value, onChange, disabled, id }: ModelSelectProps): JSX.Element {
  const [models, setModels] = useState<ModelInfo[]>([])

  useEffect(() => {
    window.api.settings.getAvailableModels().then(setModels)
  }, [])

  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
      {models.map((m) => (
        <option key={m.id} value={m.id}>
          {m.label}
        </option>
      ))}
    </select>
  )
}
