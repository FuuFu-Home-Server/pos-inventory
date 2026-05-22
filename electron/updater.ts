import { autoUpdater } from "electron-updater"
import { BrowserWindow, dialog } from "electron"

export function setupUpdater(win: BrowserWindow) {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on("update-available", () => {
    win.webContents.send("update:available")
  })

  autoUpdater.on("update-downloaded", () => {
    dialog
      .showMessageBox(win, {
        type: "info",
        title: "Update Tersedia",
        message: "Update baru telah diunduh. Restart aplikasi untuk menginstal.",
        buttons: ["Restart Sekarang", "Nanti"],
      })
      .then(({ response }) => {
        if (response === 0) autoUpdater.quitAndInstall()
      })
  })

  autoUpdater.on("error", (err) => {
    win.webContents.send("update:error", err.message)
  })

  autoUpdater.checkForUpdatesAndNotify().catch(() => {})
}
