import { app, BrowserWindow, ipcMain } from "electron"
import path from "path"
import { spawn, ChildProcess } from "child_process"
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import ElectronStore from "electron-store"

const isDev = process.env.ELECTRON_DEV === "true"
const PORT = 3000

let mainWindow: BrowserWindow | null = null
let nextProcess: ChildProcess | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const store = new (ElectronStore as any)({ defaults: { remoteUrl: "" } })

export function getDbPath(): string {
  return path.join(app.getPath("userData"), "kasir.db")
}

function runPrismaPush(): Promise<void> {
  return new Promise((resolve) => {
    const dbPath = getDbPath()
    const appRoot = isDev ? process.cwd() : path.join(process.resourcesPath, "app")
    const prismaBin = path.join(appRoot, "node_modules", ".bin", "prisma")

    const child = spawn(prismaBin, ["db", "push", "--skip-generate"], {
      cwd: appRoot,
      env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
      stdio: "pipe",
    })
    child.on("close", () => resolve())
    child.on("error", () => resolve())
  })
}

function startNextServer(): Promise<void> {
  return new Promise((resolve) => {
    const dbPath = getDbPath()
    const appRoot = isDev ? process.cwd() : path.join(process.resourcesPath, "app")

    const env = {
      ...process.env,
      DATABASE_URL: `file:${dbPath}`,
      PORT: String(PORT),
      HOSTNAME: "127.0.0.1",
      NODE_ENV: isDev ? "development" : "production",
    }

    if (isDev) {
      nextProcess = spawn("npm", ["run", "dev", "--", "--port", String(PORT)], {
        cwd: appRoot,
        env,
        stdio: "pipe",
        shell: process.platform === "win32",
      })
    } else {
      const serverScript = path.join(appRoot, ".next", "standalone", "server.js")
      nextProcess = spawn(process.execPath, [serverScript], { cwd: appRoot, env, stdio: "pipe" })
    }

    let resolved = false
    const fallbackTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true
        resolve()
      }
    }, 15000)

    nextProcess.stdout?.on("data", (chunk: Buffer) => {
      if (!resolved && chunk.toString().includes(String(PORT))) {
        resolved = true
        clearTimeout(fallbackTimer)
        resolve()
      }
    })

    nextProcess.on("error", () => {
      if (!resolved) {
        resolved = true
        clearTimeout(fallbackTimer)
        resolve()
      }
    })
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  })

  mainWindow.loadURL(`http://localhost:${PORT}`)
  mainWindow.once("ready-to-show", () => mainWindow?.show())
  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  await runPrismaPush()
  await startNextServer()
  createWindow()

  const { startSync } = await import("./sync")
  startSync(() => mainWindow?.webContents.send("sync:status"))

  if (!isDev) {
    const { setupUpdater } = await import("./updater")
    setupUpdater(mainWindow!)
  }
})

app.on("window-all-closed", async () => {
  const { stopSync } = await import("./sync")
  stopSync()
  nextProcess?.kill()
  if (process.platform !== "darwin") app.quit()
})

app.on("activate", () => {
  if (mainWindow === null) createWindow()
})

ipcMain.handle("sync:trigger", async () => {
  const { triggerSync } = await import("./sync")
  return triggerSync()
})

ipcMain.handle("sync:getStatus", async () => {
  const { getSyncStatus } = await import("./sync")
  return getSyncStatus()
})

ipcMain.handle("config:getRemoteUrl", () => {
  return store.get("remoteUrl") as string
})

ipcMain.handle("config:setRemoteUrl", async (_event, url: string) => {
  store.set("remoteUrl", url)
  const { setRemoteUrl } = await import("./sync")
  setRemoteUrl(url)
})
