import { app, BrowserWindow, ipcMain, dialog } from "electron"
import path from "path"
import fs from "fs"
import { spawn, execFile, ChildProcess } from "child_process"
import { z } from "zod"
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import ElectronStore from "electron-store"

if (process.platform === "linux") {
  app.commandLine.appendSwitch("ozone-platform", "x11")
  app.commandLine.appendSwitch("disable-gpu-sandbox")
}

const isDev = process.env.ELECTRON_DEV === "true"
const PORT = 3000

let mainWindow: BrowserWindow | null = null
let nextProcess: ChildProcess | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const store = new (ElectronStore as any)({ defaults: { remoteUrl: "" } })

function findSystemNode(): string {
  const candidates = ["/usr/bin/node", "/usr/local/bin/node", "/opt/homebrew/bin/node"]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  throw new Error("Node.js not found. Install Node.js from nodejs.org")
}

export function getDbPath(): string {
  return path.join(app.getPath("userData"), "kasir.db")
}

function runPrismaPush(): Promise<void> {
  return new Promise((resolve, reject) => {
    const dbPath = getDbPath()
    const appRoot = isDev
      ? (process.env.ELECTRON_APP_ROOT ?? path.join(__dirname, ".."))
      : path.join(process.resourcesPath, "app")

    const prismaScript = path.join(appRoot, "node_modules", "prisma", "build", "index.js")
    const schemaPath = path.join(appRoot, "prisma", "schema.prisma")
    const [cmd, args, cwd] = isDev
      ? [
          path.join(appRoot, "node_modules", ".bin", "prisma"),
          ["db", "push", "--skip-generate"],
          appRoot,
        ]
      : [
          findSystemNode(),
          [prismaScript, "db", "push", "--skip-generate", `--schema=${schemaPath}`],
          app.getPath("userData"),
        ]

    const child = spawn(cmd, args, {
      cwd,
      env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
      stdio: "pipe",
    })
    child.on("close", (code) => {
      if (code === 0) resolve()
      else reject(new Error(`prisma db push exited with code ${code}`))
    })
    child.on("error", (err) =>
      reject(
        new Error(
          `${err.message} | appRoot=${appRoot} | __dirname=${__dirname} | ELECTRON_APP_ROOT=${process.env.ELECTRON_APP_ROOT}`,
        ),
      ),
    )
  })
}

function startNextServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const dbPath = getDbPath()
    const appRoot = isDev
      ? (process.env.ELECTRON_APP_ROOT ?? path.join(__dirname, ".."))
      : path.join(process.resourcesPath, "app")

    const env = {
      ...process.env,
      DATABASE_URL: `file:${dbPath}`,
      PORT: String(PORT),
      HOSTNAME: "127.0.0.1",
      NODE_ENV: (isDev ? "development" : "production") as "development" | "production",
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
      nextProcess = spawn(findSystemNode(), [serverScript], { cwd: appRoot, env, stdio: "pipe" })
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

    nextProcess.on("error", (err) => {
      if (!resolved) {
        resolved = true
        clearTimeout(fallbackTimer)
        reject(err)
      }
    })
  })
}

function getIconPath(): string {
  const base = isDev
    ? (process.env.ELECTRON_APP_ROOT ?? path.join(__dirname, ".."))
    : process.resourcesPath
  return process.platform === "win32"
    ? path.join(base, "build", "icon.ico")
    : path.join(base, "build", "icon.png")
}

function createWindow() {
  const savedWidth = (store.get("windowWidth") as number | undefined) ?? 1280
  const savedHeight = (store.get("windowHeight") as number | undefined) ?? 800
  const savedAlwaysOnTop = (store.get("alwaysOnTop") as boolean | undefined) ?? false
  const appTitle = (store.get("appTitle") as string) || "Kasir"

  mainWindow = new BrowserWindow({
    width: savedWidth,
    height: savedHeight,
    minWidth: 1024,
    minHeight: 600,
    alwaysOnTop: savedAlwaysOnTop,
    title: appTitle,
    icon: getIconPath(),
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
  try {
    await runPrismaPush()
    if (!isDev) await startNextServer()
  } catch (err) {
    await dialog.showMessageBox({
      type: "error",
      title: "Gagal memulai aplikasi",
      message:
        err instanceof Error ? err.message : "Kesalahan tidak diketahui saat memulai server.",
      buttons: ["Keluar"],
    })
    app.quit()
    return
  }

  createWindow()

  const { startSync } = await import("./sync")
  startSync(() => mainWindow?.webContents.send("sync:status"))

  if (!isDev && mainWindow) {
    const { setupUpdater } = await import("./updater")
    setupUpdater(mainWindow)
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

ipcMain.handle("config:setRemoteUrl", async (_event, url: unknown) => {
  const parsed = z.string().url().safeParse(url)
  if (!parsed.success) return { error: "URL tidak valid" }
  store.set("remoteUrl", parsed.data)
  const { setRemoteUrl } = await import("./sync")
  setRemoteUrl(parsed.data)
})

ipcMain.handle("config:getAppInfo", () => {
  return {
    title: (store.get("appTitle") as string) || "Kasir",
    description: (store.get("appDescription") as string) || "POS & Inventori",
  }
})

ipcMain.handle("config:setAppInfo", (_event, info: unknown) => {
  const parsed = z.object({ title: z.string().min(1), description: z.string() }).safeParse(info)
  if (!parsed.success) return { error: "Data tidak valid" }
  store.set("appTitle", parsed.data.title)
  store.set("appDescription", parsed.data.description)
  mainWindow?.setTitle(parsed.data.title)
  return { ok: true }
})

ipcMain.handle("config:getWindowSettings", () => {
  if (!mainWindow) return { width: 1280, height: 800, isFullscreen: false, isAlwaysOnTop: false }
  const [width, height] = mainWindow.getSize()
  return {
    width,
    height,
    isFullscreen: mainWindow.isFullScreen(),
    isAlwaysOnTop: mainWindow.isAlwaysOnTop(),
  }
})

ipcMain.handle("config:setWindowSize", (_event, w: unknown, h: unknown) => {
  if (!mainWindow) return
  const width = typeof w === "number" ? w : 1280
  const height = typeof h === "number" ? h : 800
  store.set("windowWidth", width)
  store.set("windowHeight", height)
  mainWindow.setFullScreen(false)
  mainWindow.setSize(width, height)
  mainWindow.center()
})

ipcMain.handle("config:toggleFullscreen", () => {
  if (!mainWindow) return
  mainWindow.setFullScreen(!mainWindow.isFullScreen())
})

ipcMain.handle("config:toggleAlwaysOnTop", () => {
  if (!mainWindow) return
  const next = !mainWindow.isAlwaysOnTop()
  mainWindow.setAlwaysOnTop(next)
  store.set("alwaysOnTop", next)
})

ipcMain.handle("config:getAutoLaunch", () => {
  return app.getLoginItemSettings().openAtLogin
})

ipcMain.handle("config:setAutoLaunch", (_event, enabled: unknown) => {
  if (typeof enabled !== "boolean") return
  app.setLoginItemSettings({ openAtLogin: enabled })
})

ipcMain.handle("config:getTimezone", () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
})

ipcMain.handle("config:setTimezone", (_event, tz: unknown) => {
  if (typeof tz !== "string" || !tz) return { error: "Timezone tidak valid" }
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz })
  } catch {
    return { error: "Timezone tidak dikenal" }
  }

  const run = (file: string, args: string[]) =>
    new Promise<void>((res, rej) => execFile(file, args, (err) => (err ? rej(err) : res())))

  return (
    process.platform === "win32"
      ? run("tzutil", ["/s", tz])
      : run("timedatectl", ["set-timezone", tz])
  )
    .then(() => ({ ok: true }))
    .catch((err: Error) => ({ error: err.message }))
})
