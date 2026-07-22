import type { FeedbackField, FeedbackFieldType, FeedbackSchema } from '@shared/types'
import FreeTagInput from '@renderer/components/FreeTagInput'

interface FeedbackSchemaEditorProps {
  schema: FeedbackSchema
  onChange: (schema: FeedbackSchema) => void
  disabled?: boolean
}

const TYPE_LABELS: Record<FeedbackFieldType, string> = {
  rating: 'Rating (scale)',
  enum: 'Single choice',
  boolean: 'Yes / No',
  tags: 'Multiple choice',
  text: 'Short text'
}

export default function FeedbackSchemaEditor({
  schema,
  onChange,
  disabled
}: FeedbackSchemaEditorProps): JSX.Element {
  function updateField(index: number, patch: Partial<FeedbackField>): void {
    const fields = schema.fields.map((f, i) => (i === index ? { ...f, ...patch } : f))
    onChange({ ...schema, fields })
  }

  function changeType(index: number, type: FeedbackFieldType): void {
    updateField(index, {
      type,
      options: type === 'enum' || type === 'tags' ? [] : undefined,
      scale: type === 'rating' ? { min: 1, max: 5 } : undefined
    })
  }

  function removeField(index: number): void {
    onChange({ ...schema, fields: schema.fields.filter((_, i) => i !== index) })
  }

  function addField(): void {
    onChange({
      ...schema,
      fields: [
        ...schema.fields,
        { key: `field_${schema.fields.length + 1}`, label: '', type: 'text', required: false }
      ]
    })
  }

  return (
    <div className="schema-editor">
      {schema.fields.map((field, i) => (
        <div key={i} className="card schema-field-row">
          <div className="button-row" style={{ flexWrap: 'wrap' }}>
            <input
              value={field.label}
              placeholder="Question / label"
              onChange={(e) => updateField(i, { label: e.target.value })}
              disabled={disabled}
              style={{ flex: 2, minWidth: 160 }}
            />
            <select
              value={field.type}
              onChange={(e) => changeType(i, e.target.value as FeedbackFieldType)}
              disabled={disabled}
            >
              {(Object.keys(TYPE_LABELS) as FeedbackFieldType[]).map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <label className="small">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) => updateField(i, { required: e.target.checked })}
                disabled={disabled}
              />{' '}
              Required
            </label>
            <button
              type="button"
              className="btn-danger btn-small"
              onClick={() => removeField(i)}
              disabled={disabled}
            >
              Remove
            </button>
          </div>

          {(field.type === 'enum' || field.type === 'tags') && (
            <FreeTagInput
              values={field.options ?? []}
              onChange={(options) => updateField(i, { options })}
              disabled={disabled}
              placeholder="Type a choice and press Enter"
            />
          )}

          {field.type === 'rating' && (
            <div className="button-row">
              <label className="small">
                Min{' '}
                <input
                  type="number"
                  value={field.scale?.min ?? 1}
                  onChange={(e) =>
                    updateField(i, { scale: { min: Number(e.target.value), max: field.scale?.max ?? 5 } })
                  }
                  style={{ width: 60 }}
                  disabled={disabled}
                />
              </label>
              <label className="small">
                Max{' '}
                <input
                  type="number"
                  value={field.scale?.max ?? 5}
                  onChange={(e) =>
                    updateField(i, { scale: { min: field.scale?.min ?? 1, max: Number(e.target.value) } })
                  }
                  style={{ width: 60 }}
                  disabled={disabled}
                />
              </label>
            </div>
          )}
        </div>
      ))}

      <button type="button" className="btn-secondary" onClick={addField} disabled={disabled}>
        Add field
      </button>
      <p className="muted small">A freeform "comments" field is always included automatically.</p>
    </div>
  )
}
