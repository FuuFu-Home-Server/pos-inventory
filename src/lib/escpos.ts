const ESC = 0x1b
const GS = 0x1d

export class EscPos {
  private buf: number[] = []

  init() {
    this.buf.push(ESC, 0x40)
    return this
  }

  align(a: "left" | "center" | "right") {
    this.buf.push(ESC, 0x61, a === "left" ? 0 : a === "center" ? 1 : 2)
    return this
  }

  bold(on: boolean) {
    this.buf.push(ESC, 0x45, on ? 1 : 0)
    return this
  }

  size(w: 1 | 2, h: 1 | 2) {
    this.buf.push(GS, 0x21, ((w - 1) << 4) | (h - 1))
    return this
  }

  text(s: string) {
    for (const ch of s) {
      const code = ch.charCodeAt(0)
      this.buf.push(code < 256 ? code : 0x3f)
    }
    return this
  }

  line(s = "") {
    return this.text(s + "\n")
  }

  feed(n = 3) {
    this.buf.push(ESC, 0x64, n)
    return this
  }

  cut() {
    this.buf.push(GS, 0x56, 0x42, 3)
    return this
  }

  hr(width: number, char = "-") {
    return this.line(char.repeat(width))
  }

  cols(left: string, right: string, width: number) {
    const gap = Math.max(1, width - left.length - right.length)
    return this.line(left + " ".repeat(gap) + right)
  }

  bytes() {
    return new Uint8Array(this.buf)
  }
}
