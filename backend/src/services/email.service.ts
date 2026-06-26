import nodemailer, { Transporter } from 'nodemailer'
import { Resend } from 'resend'
import { env } from '../config/env'

export interface EmailMessage {
  to: string
  subject: string
  html: string
  text: string
}

export interface EmailService {
  send(msg: EmailMessage): Promise<void>
}

class ConsoleEmailService implements EmailService {
  async send(msg: EmailMessage): Promise<void> {
    const linkMatches = msg.text.match(/https?:\/\/[^\s]+/g) ?? []
    /* eslint-disable no-console */
    console.log('\n────────── [email:console] ──────────')
    console.log(`From:    ${env.EMAIL_FROM}`)
    console.log(`To:      ${msg.to}`)
    console.log(`Subject: ${msg.subject}`)
    console.log('Text:')
    console.log(msg.text)
    if (linkMatches.length) {
      console.log('\nExtracted link(s):')
      for (const l of linkMatches) console.log(`  → ${l}`)
    }
    console.log('────────────────────────────────────\n')
    /* eslint-enable no-console */
  }
}

class ResendEmailService implements EmailService {
  private readonly client: Resend
  constructor(apiKey: string) {
    this.client = new Resend(apiKey)
  }
  async send(msg: EmailMessage): Promise<void> {
    const res = await this.client.emails.send({
      from: env.EMAIL_FROM,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    })
    if (res.error) {
      throw new Error(`Resend send failed: ${res.error.message}`)
    }
  }
}

class SmtpEmailService implements EmailService {
  private readonly transporter: Transporter
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE ?? false,
      auth: { user: env.SMTP_USER!, pass: env.SMTP_PASS! },
    })
  }
  async send(msg: EmailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: env.EMAIL_FROM,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    })
  }
}

function createEmailService(): EmailService {
  if (env.RESEND_API_KEY) {
    console.log('[email] Using Resend provider')
    return new ResendEmailService(env.RESEND_API_KEY)
  }
  if (env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS) {
    console.log(`[email] Using SMTP provider at ${env.SMTP_HOST}:${env.SMTP_PORT}`)
    return new SmtpEmailService()
  }
  if (env.NODE_ENV === 'production') {
    throw new Error(
      'Email provider required in production — set RESEND_API_KEY or SMTP_HOST/PORT/USER/PASS',
    )
  }
  console.warn('[email] No provider configured — using console transport. NOT for production.')
  return new ConsoleEmailService()
}

export const emailService = createEmailService()

// ───── Templates ─────

const APP_NAME = 'Xpunt24'

export function verifyEmailTemplate(params: {
  name: string
  link: string
  ttlHours: number
  context: 'new_user' | 'linking_to_google'
}): EmailMessage {
  const { name, link, ttlHours, context } = params
  const subject =
    context === 'linking_to_google'
      ? `Add a password to your ${APP_NAME} account`
      : `Confirm your ${APP_NAME} email`
  const intro =
    context === 'linking_to_google'
      ? `We received a request to add a password to your account so you can sign in without Google. Confirm this is you to complete the change.`
      : `Thanks for signing up. Click the link below to confirm your email and finish creating your account.`
  const text = `Hi ${name},

${intro}

${link}

This link expires in ${ttlHours} hour${ttlHours === 1 ? '' : 's'}. If you didn't make this request, you can safely ignore this email.

— ${APP_NAME}
`
  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
<h2 style="margin:0 0 16px">${subject}</h2>
<p>Hi ${escapeHtml(name)},</p>
<p>${escapeHtml(intro)}</p>
<p style="margin:24px 0"><a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Confirm email</a></p>
<p style="color:#666;font-size:13px">Or paste this URL into your browser: <br /><a href="${link}">${link}</a></p>
<p style="color:#666;font-size:13px">This link expires in ${ttlHours} hour${ttlHours === 1 ? '' : 's'}. If you didn't make this request, you can safely ignore this email.</p>
<p style="margin-top:32px;color:#999;font-size:12px">— ${APP_NAME}</p>
</body></html>`
  return { to: '', subject, html, text }
}

export function passwordResetTemplate(params: {
  name: string
  link: string
  ttlMinutes: number
}): EmailMessage {
  const { name, link, ttlMinutes } = params
  const subject = `Reset your ${APP_NAME} password`
  const text = `Hi ${name},

We received a request to reset your password. Click the link below to set a new one:

${link}

This link expires in ${ttlMinutes} minute${ttlMinutes === 1 ? '' : 's'}. If you didn't request a reset, you can safely ignore this email.

— ${APP_NAME}
`
  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
<h2 style="margin:0 0 16px">${subject}</h2>
<p>Hi ${escapeHtml(name)},</p>
<p>We received a request to reset your password. Click the button below to set a new one.</p>
<p style="margin:24px 0"><a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Reset password</a></p>
<p style="color:#666;font-size:13px">Or paste this URL into your browser: <br /><a href="${link}">${link}</a></p>
<p style="color:#666;font-size:13px">This link expires in ${ttlMinutes} minute${ttlMinutes === 1 ? '' : 's'}. If you didn't request a reset, you can safely ignore this email.</p>
<p style="margin-top:32px;color:#999;font-size:12px">— ${APP_NAME}</p>
</body></html>`
  return { to: '', subject, html, text }
}

export function signupAttemptOnExistingTemplate(params: { name: string }): EmailMessage {
  const subject = `Someone tried to sign up with your ${APP_NAME} email`
  const text = `Hi ${params.name},

Someone (possibly you) just tried to register a new ${APP_NAME} account using this email address. Your existing account is unchanged.

If this wasn't you, no action is needed. If you've forgotten your password, you can reset it from the sign-in page.

— ${APP_NAME}
`
  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
<h2 style="margin:0 0 16px">${subject}</h2>
<p>Hi ${escapeHtml(params.name)},</p>
<p>Someone (possibly you) just tried to register a new ${APP_NAME} account using this email address. Your existing account is unchanged.</p>
<p style="color:#666;font-size:13px">If this wasn't you, no action is needed. If you've forgotten your password, you can reset it from the sign-in page.</p>
<p style="margin-top:32px;color:#999;font-size:12px">— ${APP_NAME}</p>
</body></html>`
  return { to: '', subject, html, text }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
