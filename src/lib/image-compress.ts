export async function compressImage(file: File): Promise<Blob> {
  const MAX_SIDE = 1200
  const QUALITY_HIGH = 0.82
  const QUALITY_LOW = 0.65
  const SIZE_THRESHOLD = 500 * 1024

  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      const { width, height } = img
      const ratio = Math.min(MAX_SIDE / width, MAX_SIDE / height, 1)
      const canvas = document.createElement("canvas")
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Compression failed"))
          if (blob.size <= SIZE_THRESHOLD) return resolve(blob)
          canvas.toBlob(
            (blob2) => {
              if (!blob2) return reject(new Error("Compression failed"))
              resolve(blob2)
            },
            "image/jpeg",
            QUALITY_LOW,
          )
        },
        "image/jpeg",
        QUALITY_HIGH,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Failed to load image"))
    }
    img.src = url
  })
}
