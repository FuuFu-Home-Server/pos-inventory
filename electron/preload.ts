import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld("electronAPI", {
  triggerSync: () => ipcRenderer.invoke("sync:trigger"),
  getSyncStatus: () => ipcRenderer.invoke("sync:getStatus"),
  onSyncStatus: (cb: () => void) => {
    ipcRenderer.on("sync:status", cb)
    return () => ipcRenderer.removeListener("sync:status", cb)
  },
  getRemoteUrl: () => ipcRenderer.invoke("config:getRemoteUrl"),
  setRemoteUrl: (url: string) => ipcRenderer.invoke("config:setRemoteUrl", url),
})
