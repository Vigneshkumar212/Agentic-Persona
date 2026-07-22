/**
 * Provider-agnostic LLM interface. v1 ships GeminiProvider only, but every
 * caller in this app depends on this interface (not on @google/genai
 * directly) so an OpenAI/Anthropic provider can be added later without
 * touching business logic.
 */

export interface GenerateUsage {
  inputTokens: number
  outputTokens: number
}

export interface StructuredResult<T> {
  data: T
  usage: GenerateUsage
}

export interface TextResult {
  text: string
  usage: GenerateUsage
}

export interface MultimodalPart {
  kind: 'text' | 'file'
  text?: string
  /** For 'file': raw bytes and mime type, sent inline to the model. */
  data?: Buffer
  mimeType?: string
}

export interface GenerateOptions {
  model: string
  systemInstruction?: string
  /** Plain text prompt, or an ordered list of multimodal parts. */
  input: string | MultimodalPart[]
}

export interface StructuredGenerateOptions extends GenerateOptions {
  /** JSON Schema (subset Gemini supports) describing the desired output shape. */
  responseSchema: Record<string, unknown>
}

export interface StreamChunk {
  textDelta: string
}

export interface LLMProvider {
  /** Cheap validation call — used when the user first enters an API key. */
  validateApiKey(): Promise<{ ok: true } | { ok: false; error: string }>

  listModels(): Promise<string[]>

  countTokens(model: string, input: string | MultimodalPart[]): Promise<number>

  generateStructured<T = unknown>(options: StructuredGenerateOptions): Promise<StructuredResult<T>>

  generateText(options: GenerateOptions): Promise<TextResult>

  generateStream(options: GenerateOptions, onChunk: (chunk: StreamChunk) => void): Promise<TextResult>
}
