import { app, dialog } from 'electron'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, extname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { PickAndAddDocumentsResult, Project, TrialDocument } from '../../../shared/types'
import type { LLMProvider, MultimodalPart } from '../llm/LLMProvider'
import { addTrialDocument } from '../db/trialDocumentsRepo'
import { getProvider } from '../llm/providerRegistry'

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024

const EXTENSION_MIME: Record<string, string> = {
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp'
}

const TEXT_EXTENSIONS = new Set(['.txt', '.md'])

function isTextExtension(ext: string): boolean {
  return TEXT_EXTENSIONS.has(ext)
}

function trialFilesDir(trialId: string): string {
  const dir = join(app.getPath('userData'), 'trial-files', trialId)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

export async function pickAndAddDocuments(trialId: string, project: Project): Promise<PickAndAddDocumentsResult> {
  const result = await dialog.showOpenDialog({
    title: 'Add product context documents',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Supported documents', extensions: ['txt', 'md', 'pdf', 'png', 'jpg', 'jpeg', 'webp'] }]
  })

  if (result.canceled || result.filePaths.length === 0) {
    return { documents: [], skipped: [] }
  }

  const documents: TrialDocument[] = []
  const skipped: string[] = []
  const llm = getProvider(project.provider)

  for (const filePath of result.filePaths) {
    const ext = extname(filePath).toLowerCase()
    const mimeType = EXTENSION_MIME[ext]
    const filename = basename(filePath)
    const stats = statSync(filePath)

    if (!mimeType || stats.size > MAX_FILE_SIZE_BYTES) {
      skipped.push(filename)
      continue
    }

    const id = randomUUID()
    const storedPath = join(trialFilesDir(trialId), `${id}${ext}`)
    const buffer = readFileSync(filePath)
    writeFileSync(storedPath, buffer)

    const tokensEst = await countDocumentTokens(llm, project.model, buffer, mimeType, isTextExtension(ext))

    documents.push(
      addTrialDocument({ trialId, filename, mimeType, size: stats.size, tokensEst, storedPath })
    )
  }

  return { documents, skipped }
}

async function countDocumentTokens(
  llm: LLMProvider,
  model: string,
  buffer: Buffer,
  mimeType: string,
  isText: boolean
): Promise<number> {
  try {
    if (isText) return await llm.countTokens(model, buffer.toString('utf-8'))
    return await llm.countTokens(model, [{ kind: 'file', data: buffer, mimeType }])
  } catch {
    // Token counting here is a best-effort estimate for the UI — never block the upload on it.
    return 0
  }
}

/** Converts a stored document back into a prompt part for feedback generation. */
export function documentToPromptPart(doc: TrialDocument): MultimodalPart {
  if (isTextExtension(extname(doc.storedPath).toLowerCase())) {
    const text = readFileSync(doc.storedPath, 'utf-8')
    return { kind: 'text', text: `Document "${doc.filename}":\n${text}` }
  }
  return { kind: 'file', data: readFileSync(doc.storedPath), mimeType: doc.mimeType }
}
