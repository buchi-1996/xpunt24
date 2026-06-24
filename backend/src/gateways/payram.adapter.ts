import crypto from 'crypto'
import { env } from '../config/env'
import { AppError } from '../utils/AppError'

export interface DepositIntent {
  providerReference: string
  address: string
  expiresAt: Date
}

export interface DepositStatusResponse {
  status: 'OPEN' | 'VERIFYING' | 'FILLED' | 'OVER_FILLED' | 'PARTIALLY_FILLED' | 'EXPIRED' | 'FAILED'
  receivedAmount?: string
  txHash?: string
}

export interface PayRamWebhookPayload {
  reference_id: string
  status: 'OPEN' | 'VERIFYING' | 'FILLED' | 'OVER_FILLED' | 'PARTIALLY_FILLED' | 'EXPIRED' | 'FAILED'
  amount: string
  currency: string
  filled_amount?: string
  tx_hash?: string
}

export type PayoutStatus =
  | 'pending-approval'
  | 'pending'
  | 'approved'
  | 'initiated'
  | 'sent'
  | 'processed'
  | 'failed'
  | 'rejected'
  | 'cancelled'

export interface PayoutResponse {
  id: number
  status: PayoutStatus
  toAddress: string
  amount: string
  blockchainCode: string
  currencyCode: string
  createdAt?: string
}

export interface PayRamPayoutWebhookPayload {
  event_type: string // payout.<status>
  payout_id: number
  network: string
  token: string
  amount: string
  amount_usd?: string
  email?: string
  address: string
  from_address?: string
  tx_hash?: string
  status: string
  withdrawal_type?: string
  currency_type?: string
  created_at?: number
  updated_at?: number
  timestamp?: number
  failure_reason?: string
}

class PayRamAdapter {
  private readonly baseUrl: string
  private readonly apiKey: string

  constructor() {
    this.baseUrl = env.PAYRAM_API_URL.replace(/\/+$/, '')
    this.apiKey = env.PAYRAM_API_KEY
  }

  private get headers() {
    return {
      'API-Key': this.apiKey,
      'Content-Type': 'application/json',
    }
  }

  // Two-step flow: create a payment record, then assign a deposit address for the chosen chain.
  async createDepositIntent(params: {
    amountInUSD: number
    customerEmail: string
    customerID: string
    blockchainCode?: string // PayRam: BTC | ETH | TRX | BASE | POLYGON. Default TRX (TRC20 USDT).
    expireSeconds?: number
  }): Promise<DepositIntent> {
    const paymentRes = await fetch(`${this.baseUrl}/api/v1/payment`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        customerEmail: params.customerEmail,
        customerID: params.customerID,
        amountInUSD: params.amountInUSD,
      }),
    })
    if (!paymentRes.ok) {
      const body = await paymentRes.text()
      throw new AppError(`PayRam create-payment ${paymentRes.status}: ${body}`, 502, 'GATEWAY_ERROR')
    }
    const payment = (await paymentRes.json()) as { reference_id?: string }
    if (!payment.reference_id) {
      throw new AppError('PayRam create-payment returned no reference_id', 502, 'GATEWAY_ERROR')
    }

    const blockchainCode = params.blockchainCode ?? 'TRX'
    const addrRes = await fetch(
      `${this.baseUrl}/api/v1/deposit-address/reference/${payment.reference_id}`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ blockchain_code: blockchainCode }),
      },
    )
    if (!addrRes.ok) {
      const body = await addrRes.text()
      throw new AppError(`PayRam assign-address ${addrRes.status}: ${body}`, 502, 'GATEWAY_ERROR')
    }
    const addr = (await addrRes.json()) as { Address?: string }
    if (!addr.Address) {
      throw new AppError('PayRam assign-address returned no Address', 502, 'GATEWAY_ERROR')
    }

    return {
      providerReference: payment.reference_id,
      address: addr.Address,
      expiresAt: new Date(Date.now() + (params.expireSeconds ?? 3600) * 1000),
    }
  }

  // PayRam signs webhooks with HMAC-SHA256(rawBody, apiKey), sent in
  // X-Payram-Signature as "sha256=<hex>". Strip the algorithm prefix before comparing.
  verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
    if (!signature || !rawBody) return false
    const provided = signature.startsWith('sha256=') ? signature.slice('sha256='.length) : signature
    const expected = crypto.createHmac('sha256', this.apiKey).update(rawBody).digest('hex')
    const a = Buffer.from(expected, 'hex')
    const b = Buffer.from(provided, 'hex')
    if (a.length !== b.length || a.length === 0) return false
    return crypto.timingSafeEqual(a, b)
  }

  // PayRam payout — POST /api/v1/withdrawal/merchant
  // Returns a numeric `id` which is the payout reference; we store it on the Withdrawal row.
  async createPayout(params: {
    amount: string
    customerEmail: string
    customerID: string
    toAddress: string
    blockchainCode?: string // default TRX
    currencyCode?: string // default USDT
  }): Promise<PayoutResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/withdrawal/merchant`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        email: params.customerEmail,
        customerID: params.customerID,
        toAddress: params.toAddress,
        amount: params.amount,
        blockchainCode: params.blockchainCode ?? 'TRX',
        currencyCode: params.currencyCode ?? 'USDT',
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new AppError(`PayRam payout ${res.status}: ${body}`, 502, 'GATEWAY_ERROR')
    }
    const data = (await res.json()) as PayoutResponse
    if (!data.id) throw new AppError('PayRam payout returned no id', 502, 'GATEWAY_ERROR')
    return data
  }

  // GET /api/v1/withdrawal/{id}/merchant — used by status-polling cron as a safety net to webhooks.
  async getPayoutStatus(payoutId: string | number): Promise<PayoutResponse & { tx_hash?: string }> {
    const res = await fetch(`${this.baseUrl}/api/v1/withdrawal/${payoutId}/merchant`, {
      headers: { 'API-Key': this.apiKey },
    })
    if (!res.ok) {
      const body = await res.text()
      throw new AppError(`PayRam payout-status ${res.status}: ${body}`, 502, 'GATEWAY_ERROR')
    }
    return (await res.json()) as PayoutResponse & { tx_hash?: string }
  }

  async getDepositStatus(providerReference: string): Promise<DepositStatusResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/payment/${providerReference}`, {
      headers: {
        'API-Key': this.apiKey,
      },
    })

    if (!res.ok) {
      throw new AppError(`PayRam status fetch error ${res.status}`, 502, 'GATEWAY_ERROR')
    }

    const data = (await res.json()) as {
      status: DepositStatusResponse['status']
      filled_amount?: string
      tx_hash?: string
    }

    return {
      status: data.status,
      receivedAmount: data.filled_amount,
      txHash: data.tx_hash,
    }
  }
}

export const payRamAdapter = new PayRamAdapter()
