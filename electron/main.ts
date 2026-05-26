import { ChildProcess, execFile, spawn } from "child_process"
import crypto from "crypto"
import { app, BrowserWindow, dialog, ipcMain } from "electron"
import fs from "fs"
import path from "path"
import { z } from "zod"

import ElectronStore from "electron-store"

if (process.platform === "linux") {
  app.commandLine.appendSwitch("no-sandbox")
  app.commandLine.appendSwitch("disable-gpu-sandbox")
  app.commandLine.appendSwitch("disable-dev-shm-usage")
  app.commandLine.appendSwitch("no-zygote")
  app.commandLine.appendSwitch("host-resolver-rules", "MAP localhost 127.0.0.1")
}

const isDev = process.env.ELECTRON_DEV === "true"
const PORT = 3000

let mainWindow: BrowserWindow | null = null
let nextProcess: ChildProcess | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const store = new (ElectronStore as any)({ defaults: { remoteUrl: "" } })

function findSystemNode(): string {
  if (process.platform === "win32") {
    const bases = [
      process.env.PROGRAMFILES,
      process.env["PROGRAMFILES(X86)"],
      process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Programs") : null,
      "C:\\Program Files",
    ].filter(Boolean) as string[]
    for (const base of bases) {
      const p = path.join(base, "nodejs", "node.exe")
      if (fs.existsSync(p)) return p
    }
    throw new Error("Node.js tidak ditemukan. Install Node.js dari nodejs.org")
  }
  const candidates = ["/usr/bin/node", "/usr/local/bin/node", "/opt/homebrew/bin/node"]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  throw new Error("Node.js tidak ditemukan. Install Node.js dari nodejs.org")
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

    const standaloneRoot = isDev
      ? path.join(appRoot, ".next", "standalone")
      : path.join(process.resourcesPath, "app", "standalone")
    const prismaScript = path.join(standaloneRoot, "node_modules", "prisma", "build", "index.js")
    const schemaPath = isDev
      ? path.join(appRoot, "prisma", "schema.prisma")
      : path.join(process.resourcesPath, "app", "prisma", "schema.prisma")
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
    const stderr: Buffer[] = []
    child.stderr?.on("data", (chunk: Buffer) => stderr.push(chunk))
    child.on("close", (code) => {
      if (code === 0) resolve()
      else
        reject(
          new Error(
            `prisma db push exited with code ${code}\n${Buffer.concat(stderr).toString().slice(0, 500)}`,
          ),
        )
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

    let authSecret = store.get("authSecret") as string | undefined
    if (!authSecret) {
      authSecret = crypto.randomBytes(32).toString("hex")
      store.set("authSecret", authSecret)
    }

    const syncSecret = (store.get("syncSecret") as string | undefined) ?? ""

    const env = {
      ...process.env,
      DATABASE_URL: `file:${dbPath}`,
      AUTH_SECRET: authSecret,
      AUTH_URL: `http://127.0.0.1:${PORT}`,
      NEXTAUTH_SECRET: authSecret,
      NEXTAUTH_URL: `http://127.0.0.1:${PORT}`,
      SYNC_SECRET: syncSecret,
      ELECTRON_USER_DATA: app.getPath("userData"),
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
      const serverScript = path.join(process.resourcesPath, "app", "standalone", "server.js")
      const logFile = fs.createWriteStream(path.join(app.getPath("userData"), "server.log"), {
        flags: "a",
      })
      nextProcess = spawn(findSystemNode(), [serverScript], {
        cwd: app.getPath("userData"),
        env,
        stdio: "pipe",
      })
      nextProcess.stderr?.pipe(logFile)
    }

    let resolved = false
    const fallbackTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true
        resolve()
      }
    }, 15000)

    nextProcess.stdout?.on("data", (chunk: Buffer) => {
      if (!isDev) fs.appendFileSync(path.join(app.getPath("userData"), "server.log"), chunk)
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
  mainWindow.webContents.on("will-redirect", (_e, url) => {
    if (url.includes("localhost")) {
      mainWindow?.loadURL(url.replace(/localhost/g, "127.0.0.1"))
    }
  })

  const logPath = path.join(app.getPath("userData"), "renderer.log")
  mainWindow.webContents.on("did-fail-load", (_e, code, desc, url) => {
    fs.appendFileSync(logPath, `[did-fail-load] ${code} ${desc} url=${url}\n`)
  })
  mainWindow.webContents.on("console-message", (_e, level, msg, line, src) => {
    fs.appendFileSync(logPath, `[console:${level}] ${msg} (${src}:${line})\n`)
  })
  mainWindow.webContents.on("render-process-gone", (_e, details) => {
    fs.appendFileSync(logPath, `[render-process-gone] ${JSON.stringify(details)}\n`)
  })

  mainWindow.loadURL(`http://127.0.0.1:${PORT}`)
  mainWindow.once("ready-to-show", () => mainWindow?.show())
  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  fs.mkdirSync(path.join(app.getPath("userData"), "uploads", "purchase-lists"), { recursive: true })
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

  const wantSeed = process.argv.includes("--seed") || process.argv.includes("--force-seed")
  if (wantSeed) {
    const force = process.argv.includes("--force-seed")
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/api/seed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      })
      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string }
      await dialog.showMessageBox({
        type: res.ok ? "info" : "warning",
        title: "Seed Database",
        message: data.message ?? data.error ?? "Selesai",
        buttons: ["OK"],
      })
    } catch (err) {
      await dialog.showMessageBox({
        type: "error",
        title: "Seed gagal",
        message: err instanceof Error ? err.message : String(err),
        buttons: ["OK"],
      })
    }
  }

  createWindow()

  const { startSync, setRemoteUrl, setUserDataPath } = await import("./sync")
  setUserDataPath(app.getPath("userData"))
  const savedRemoteUrl = (store.get("remoteUrl") as string | undefined) ?? ""
  if (savedRemoteUrl) setRemoteUrl(savedRemoteUrl)
  startSync(() => mainWindow?.webContents.send("sync:status"), store.get("syncSecret") as string)

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

ipcMain.handle("sync:mirror-pull", async () => {
  const { triggerPullMirror } = await import("./sync")
  return triggerPullMirror()
})

ipcMain.handle("sync:mirror-push", async () => {
  const { triggerPushMirror } = await import("./sync")
  return triggerPushMirror()
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

ipcMain.handle("config:getSyncSecret", () => {
  return store.get("syncSecret") as string
})

ipcMain.handle("config:setSyncSecret", async (_event, secret: unknown) => {
  const parsed = z.string().min(16).safeParse(secret)
  if (!parsed.success) return { error: "Secret minimal 16 karakter" }
  store.set("syncSecret", parsed.data)
  const { setSyncSecret } = await import("./sync")
  setSyncSecret(parsed.data)
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
