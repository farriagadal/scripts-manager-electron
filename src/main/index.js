import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { spawn } from 'child_process'

const is = { dev: process.env.NODE_ENV === 'development' }

const SCRIPTS_FILE = join(app.getPath('userData'), 'scripts.json')

function loadScripts() {
  if (!existsSync(SCRIPTS_FILE)) return []
  try {
    return JSON.parse(readFileSync(SCRIPTS_FILE, 'utf-8'))
  } catch {
    return []
  }
}

function saveScriptsToFile(scripts) {
  writeFileSync(SCRIPTS_FILE, JSON.stringify(scripts, null, 2), 'utf-8')
}

let mainWindow = null
let runningProcess = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 720,
    minWidth: 800,
    minHeight: 500,
    backgroundColor: '#0d1117',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    show: false,
    titleBarStyle: 'default',
    title: 'Scripts Manager'
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('closed', () => {
    if (runningProcess) {
      runningProcess.kill()
      runningProcess = null
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ── IPC handlers ──────────────────────────────────────────────────────────────

ipcMain.handle('scripts:get', () => loadScripts())

ipcMain.handle('scripts:save', (_, scripts) => {
  saveScriptsToFile(scripts)
  return true
})

ipcMain.handle('dialog:select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Scripts', extensions: ['py', 'js', 'ts', 'sh', 'bat', 'ps1', 'rb', 'php'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('dialog:select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('script:run', (_, script) => {
  if (runningProcess) return { ok: false, error: 'A script is already running' }

  const { interpreter, path: scriptPath, args, cwd } = script

  let cmd, cmdArgs

  switch (interpreter) {
    case 'python':
    case 'python3':
      cmd = interpreter
      cmdArgs = [scriptPath]
      break
    case 'node':
      cmd = 'node'
      cmdArgs = [scriptPath]
      break
    case 'bash':
      cmd = 'bash'
      cmdArgs = [scriptPath]
      break
    case 'powershell':
      cmd = 'powershell'
      cmdArgs = ['-ExecutionPolicy', 'Bypass', '-File', scriptPath]
      break
    case 'cmd':
      cmd = 'cmd'
      cmdArgs = ['/c', scriptPath]
      break
    default:
      cmd = interpreter
      cmdArgs = [scriptPath]
  }

  const extraArgs = args
    ? args.split(' ').filter((a) => a.trim().length > 0)
    : []
  cmdArgs = [...cmdArgs, ...extraArgs]

  const spawnOptions = {
    cwd: cwd && existsSync(cwd) ? cwd : undefined,
    shell: true,
    windowsHide: true
  }

  try {
    runningProcess = spawn(cmd, cmdArgs, spawnOptions)

    runningProcess.stdout.on('data', (data) => {
      mainWindow?.webContents.send('script:output', { type: 'stdout', text: data.toString() })
    })

    runningProcess.stderr.on('data', (data) => {
      mainWindow?.webContents.send('script:output', { type: 'stderr', text: data.toString() })
    })

    runningProcess.on('close', (code) => {
      mainWindow?.webContents.send('script:output', {
        type: 'exit',
        text: `\n[Process finished with exit code ${code}]\n`
      })
      mainWindow?.webContents.send('script:done', code)
      runningProcess = null
    })

    runningProcess.on('error', (err) => {
      mainWindow?.webContents.send('script:output', {
        type: 'stderr',
        text: `\n[Error starting process: ${err.message}]\n`
      })
      mainWindow?.webContents.send('script:done', 1)
      runningProcess = null
    })

    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

ipcMain.handle('script:stop', () => {
  if (runningProcess) {
    runningProcess.kill()
    runningProcess = null
    mainWindow?.webContents.send('script:output', { type: 'stderr', text: '\n[Process killed by user]\n' })
    mainWindow?.webContents.send('script:done', -1)
  }
})
