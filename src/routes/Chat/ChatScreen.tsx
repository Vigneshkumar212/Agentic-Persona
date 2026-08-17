import { FormEvent, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Chat, ChatMessage, Persona } from '@shared/types'

export default function ChatScreen(): JSX.Element {
  const { projectId, trialId, personaId } = useParams<{
    projectId: string
    trialId?: string
    personaId: string
  }>()
  const navigate = useNavigate()

  const [chat, setChat] = useState<Chat | null>(null)
  const [persona, setPersona] = useState<Persona | null | undefined>(undefined)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!personaId) return
    window.api.personas.get(personaId).then(setPersona)
  }, [personaId])

  useEffect(() => {
    if (!projectId || !personaId) return
    let cancelled = false
    window.api.chats.findOrCreate(projectId, trialId ?? null, personaId).then(async (c) => {
      if (cancelled) return
      setChat(c)
      setMessages(await window.api.chats.listMessages(c.id))
    })
    return () => {
      cancelled = true
    }
  }, [projectId, trialId, personaId])

  useEffect(() => {
    return window.api.chats.onStreamChunk(({ chatId, textDelta }) => {
      if (chat && chatId === chat.id) {
        setStreamingText((prev) => prev + textDelta)
      }
    })
  }, [chat])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, streamingText])

  async function handleSend(e: FormEvent): Promise<void> {
    e.preventDefault()
    const content = input.trim()
    if (!chat || !content || sending) return

    setInput('')
    setSending(true)
    setError(null)
    setStreamingText('')
    setMessages((prev) => [
      ...prev,
      {
        id: `optimistic-${Date.now()}`,
        chatId: chat.id,
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
        tokensIn: 0,
        tokensOut: 0,
        model: ''
      }
    ])

    try {
      await window.api.chats.sendMessage(chat.id, content)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setMessages(await window.api.chats.listMessages(chat.id))
      setStreamingText('')
      setSending(false)
    }
  }

  const backTo = trialId ? `/project/${projectId}/trial/${trialId}` : `/project/${projectId}`

  return (
    <div className="screen">
      <header className="page-header">
        <h1>{persona?.persona.name ?? 'Chat'}</h1>
        <button className="btn-secondary" onClick={() => navigate(backTo)}>
          Back
        </button>
      </header>

      {persona && <p className="muted small">{persona.persona.oneLineSummary}</p>}

      <div className="chat-messages" ref={scrollRef}>
        {messages.map((m) => (
          <div key={m.id} className={`chat-bubble chat-bubble-${m.role}`}>
            <p>{m.content}</p>
          </div>
        ))}
        {sending && (
          <div className="chat-bubble chat-bubble-model">
            <p>{streamingText || '…'}</p>
          </div>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      <form onSubmit={handleSend} className="chat-input-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask ${persona?.persona.name ?? 'this persona'} a follow-up…`}
          disabled={sending || !chat}
        />
        <button type="submit" disabled={sending || !input.trim() || !chat}>
          {sending ? 'Sending…' : 'Send'}
        </button>
      </form>
    </div>
  )
}
