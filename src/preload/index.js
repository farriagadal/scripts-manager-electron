import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  // Scripts CRUD
  getScripts: () => ipcRenderer.invoke('scripts:get'),
  saveScripts: (scripts) => ipcRenderer.invoke('scripts:save', scripts),

  // File dialogs
  selectFile: () => ipcRenderer.invoke('dialog:select-file'),
  selectFolder: () => ipcRenderer.invoke('dialog:select-folder'),

  // Script execution
  runScript: (script) => ipcRenderer.invoke('script:run', script),
  stopScript: () => ipcRenderer.invoke('script:stop'),

  // Events from main process
  onOutput: (callback) => {
    const handler = (_, data) => callback(data)
    ipcRenderer.on('script:output', handler)
    return () => ipcRenderer.removeListener('script:output', handler)
  },
  onDone: (callback) => {
    const handler = (_, code) => callback(code)
    ipcRenderer.on('script:done', handler)
    return () => ipcRenderer.removeListener('script:done', handler)
  }
})
