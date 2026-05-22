interface SerialPortInfo {
  usbVendorId?: number
  usbProductId?: number
}

interface SerialOptions {
  baudRate: number
  dataBits?: number
  stopBits?: number
  parity?: "none" | "even" | "odd"
  bufferSize?: number
  flowControl?: "none" | "hardware"
}

interface SerialPort {
  readonly readable: ReadableStream | null
  readonly writable: WritableStream | null
  open(options: SerialOptions): Promise<void>
  close(): Promise<void>
  getInfo(): SerialPortInfo
}

interface Serial extends EventTarget {
  requestPort(options?: { filters?: SerialPortFilter[] }): Promise<SerialPort>
  getPorts(): Promise<SerialPort[]>
}

interface SerialPortFilter {
  usbVendorId?: number
  usbProductId?: number
}

interface Navigator {
  readonly serial: Serial
}
