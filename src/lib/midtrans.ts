import crypto from "crypto"

const BASE_URL =
  process.env.MIDTRANS_IS_PRODUCTION === "true"
    ? "https://api.midtrans.com/v2"
    : "https://api.sandbox.midtrans.com/v2"

function authHeader(): string {
  const key = process.env.MIDTRANS_SERVER_KEY
  if (!key) throw new Error("MIDTRANS_SERVER_KEY is not set")
  return "Basic " + Buffer.from(key + ":").toString("base64")
}

export function generateOrderId(): string {
  return `KASIR-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`
}

export type QrisChargeResult = {
  status_code: string
  order_id: string
  qr_string: string
  transaction_status: string
  gross_amount: string
}

export async function createQrisCharge(
  orderId: string,
  grossAmount: number,
): Promise<QrisChargeResult> {
  const res = await fetch(`${BASE_URL}/charge`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
      Accept: "application/json",
    },
    body: JSON.stringify({
      payment_type: "qris",
      transaction_details: { order_id: orderId, gross_amount: grossAmount },
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { status_message?: string }).status_message ?? "Midtrans charge failed")
  }
  return res.json()
}

export type QrisStatusResult = {
  transaction_status: string
  status_code: string
  gross_amount: string
  order_id: string
}

export async function getQrisStatus(orderId: string): Promise<QrisStatusResult> {
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(orderId)}/status`, {
    headers: { Authorization: authHeader(), Accept: "application/json" },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(
      (err as { status_message?: string }).status_message ?? "Midtrans status check failed",
    )
  }
  return res.json()
}

export function verifyWebhookSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  receivedSignature: string,
): boolean {
  const serverKey = process.env.MIDTRANS_SERVER_KEY
  if (!serverKey) throw new Error("MIDTRANS_SERVER_KEY is not set")
  const expected = crypto
    .createHash("sha512")
    .update(orderId + statusCode + grossAmount + serverKey)
    .digest("hex")
  return expected === receivedSignature
}
