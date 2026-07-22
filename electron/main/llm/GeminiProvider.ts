import { GoogleGenAI } from '@google/genai'
import type {
  GenerateOptions,
  GenerateUsage,
  LLMProvider,
  MultimodalPart,
  StreamChunk,
  StructuredGenerateOptions,
  StructuredResult,
  TextResult
} from './LLMProvider'

function toContents(input: string | MultimodalPart[]): unknown {
  if (typeof input === 'string') return input

  const parts = input.map((part) => {
    if (part.kind === 'text') return { text: part.text ?? '' }
    if (!part.data || !part.mimeType) {
      throw new Error('Multimodal file part is missing data or mimeType.')
    }
    return { inlineData: { mimeType: part.mimeType, data: part.data.toString('base64') } }
  })
  return [{ role: 'user', parts }]
}

function toUsage(usageMetadata: unknown): GenerateUsage {
  const meta = (usageMetadata ?? {}) as {
    promptTokenCount?: number
    candidatesTokenCount?: number
  }
  return {
    inputTokens: meta.promptTokenCount ?? 0,
    outputTokens: meta.candidatesTokenCount ?? 0
  }
}

export class GeminiProvider implements LLMProvider {
  private client: GoogleGenAI

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey })
  }

  async validateApiKey(): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      // Cheapest possible round trip: count tokens for a tiny string.
      await this.client.models.countTokens({
        model: 'gemini-2.5-flash-lite',
        contents: 'ping'
      })
      return { ok: true }
    } catch (err) {
      return { ok: false, error: describeError(err) }
    }
  }

  async listModels(): Promise<string[]> {
    const names: string[] = []
    const pager = await this.client.models.list()
    for await (const m of pager) {
      if (m.name) names.push(m.name.replace(/^models\//, ''))
    }
    return names
  }

  async countTokens(model: string, input: string | MultimodalPart[]): Promise<number> {
    const result = await this.client.models.countTokens({ model, contents: toContents(input) as never })
    return result.totalTokens ?? 0
  }

  async generateStructured<T = unknown>(
    options: StructuredGenerateOptions
  ): Promise<StructuredResult<T>> {
    const response = await this.client.models.generateContent({
      model: options.model,
      contents: toContents(options.input) as never,
      config: {
        systemInstruction: options.systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: options.responseSchema as never
      }
    })
    const text = response.text ?? '{}'
    let data: T
    try {
      data = JSON.parse(text) as T
    } catch {
      throw new Error(`Gemini returned non-JSON output despite responseSchema: ${text.slice(0, 200)}`)
    }
    return { data, usage: toUsage(response.usageMetadata) }
  }

  async generateText(options: GenerateOptions): Promise<TextResult> {
    const response = await this.client.models.generateContent({
      model: options.model,
      contents: toContents(options.input) as never,
      config: { systemInstruction: options.systemInstruction }
    })
    return { text: response.text ?? '', usage: toUsage(response.usageMetadata) }
  }

  async generateStream(
    options: GenerateOptions,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<TextResult> {
    const stream = await this.client.models.generateContentStream({
      model: options.model,
      contents: toContents(options.input) as never,
      config: { systemInstruction: options.systemInstruction }
    })

    let fullText = ''
    let usage: GenerateUsage = { inputTokens: 0, outputTokens: 0 }
    for await (const chunk of stream) {
      const delta = chunk.text ?? ''
      if (delta) {
        fullText += delta
        onChunk({ textDelta: delta })
      }
      if (chunk.usageMetadata) usage = toUsage(chunk.usageMetadata)
    }
    return { text: fullText, usage }
  }
}

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}
