import { ipcMain } from 'electron'
import { findOrCreateChat, listMessages } from '../db/chatsRepo'
import { getPersona } from '../db/personasRepo'
import { sendChatMessage } from '../chat/chatEngine'

export function registerChatsIpc(): void {
  ipcMain.handle('chats:find-or-create', (_e, projectId: string, trialId: string | null, personaId: string) => {
    const persona = getPersona(personaId)
    const title = persona ? `Chat with ${persona.name}` : 'Chat'
    return findOrCreateChat(projectId, trialId, personaId, title)
  })

  ipcMain.handle('chats:list-messages', (_e, chatId: string) => listMessages(chatId))

  ipcMain.handle('chats:send-message', (event, chatId: string, content: string) =>
    sendChatMessage(chatId, content, (delta) => {
      event.sender.send('chats:stream-chunk', { chatId, textDelta: delta })
    })
  )
}
