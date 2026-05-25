import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld("electronAPI", {
  triggerSync: () => ipcRenderer.invoke("sync:trigger"),
  triggerMirror: () => ipcRenderer.invoke("sync:mirror"),
  getSyncStatus: () => ipcRenderer.invoke("sync:getStatus"),
  onSyncStatus: (cb: () => void) => {
    ipcRenderer.on("sync:status", cb)
    return () => ipcRenderer.removeListener("sync:status", cb)
  },
  getRemoteUrl: () => ipcRenderer.invoke("config:getRemoteUrl"),
  setRemoteUrl: (url: string) => ipcRenderer.invoke("config:setRemoteUrl", url),
  getSyncSecret: () => ipcRenderer.invoke("config:getSyncSecret"),
  setSyncSecret: (secret: string) => ipcRenderer.invoke("config:setSyncSecret", secret),
  getAppInfo: () => ipcRenderer.invoke("config:getAppInfo"),
  setAppInfo: (info: { title: string; description: string }) =>
    ipcRenderer.invoke("config:setAppInfo", info),
  getWindowSettings: () => ipcRenderer.invoke("config:getWindowSettings"),
  setWindowSize: (w: number, h: number) => ipcRenderer.invoke("config:setWindowSize", w, h),
  toggleFullscreen: () => ipcRenderer.invoke("config:toggleFullscreen"),
  toggleAlwaysOnTop: () => ipcRenderer.invoke("config:toggleAlwaysOnTop"),
  getAutoLaunch: () => ipcRenderer.invoke("config:getAutoLaunch"),
  setAutoLaunch: (enabled: boolean) => ipcRenderer.invoke("config:setAutoLaunch", enabled),
  getTimezone: () => ipcRenderer.invoke("config:getTimezone"),
  setTimezone: (tz: string) => ipcRenderer.invoke("config:setTimezone", tz),
})
