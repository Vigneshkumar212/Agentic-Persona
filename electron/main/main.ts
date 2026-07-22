import { app, BrowserWindow, shell } from 'electron'
import { join } from 'node:path'
import { initDatabase } from './db/database'
import { initProviderFromStoredKey } from './llm/providerRegistry'
import { registerAppIpc } from './ipc/app'
import { registerSettingsIpc } from './ipc/settings'
import { registerProjectsIpc } from './ipc/projects'
import { registerPersonasIpc } from './ipc/personas'
import { registerFeedbackSchemaIpc } from './ipc/feedbackSchema'

const isDev = !app.isPackaged

function createMainWindow(): void {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  win.once('ready-to-show', () => win.show())

  if (isDev) {
    // Surface renderer console output (including uncaught errors) in the
    // same terminal as the main process for easier local debugging.
    win.webContents.on('console-message', (_e, level, message, line, sourceId) => {
      console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`)
    })
  }

  // Open external links in the OS browser, never inside the app window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function registerIpcHandlers(): void {
  registerAppIpc()
  registerSettingsIpc()
  registerProjectsIpc()
  registerPersonasIpc()
  registerFeedbackSchemaIpc()
}

app.whenReady().then(() => {
  initDatabase()
  initProviderFromStoredKey()
  registerIpcHandlers()

  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
