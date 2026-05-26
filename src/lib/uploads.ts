import path from "path"

export function getUploadsDir(): string {
  if (process.env.ELECTRON_USER_DATA) {
    return path.join(process.env.ELECTRON_USER_DATA, "uploads", "purchase-lists")
  }
  return path.join(process.cwd(), "public", "uploads", "purchase-lists")
}
