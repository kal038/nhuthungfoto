#!/usr/bin/env node
// Registers the Telegram webhook that delivers admin button callbacks to this
// Worker. Telegram does not discover the URL by convention: it must be set once
// per environment via the Bot API setWebhook method.
//
// Usage:
//   node scripts/set-telegram-webhook.mjs set --url=https://<worker>/v1/telegram/webhook
//   node scripts/set-telegram-webhook.mjs info
//   node scripts/set-telegram-webhook.mjs delete
//
// Env (process.env or backend/.dev.vars):
//   TELEGRAM_BOT_TOKEN        required
//   TELEGRAM_WEBHOOK_SECRET   required for set (sent as secret_token)
//   TELEGRAM_WEBHOOK_URL      fallback for --url

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const TELEGRAM_API = 'https://api.telegram.org'
const WEBHOOK_PATH = '/v1/telegram/webhook'

/** Minimal KEY=VALUE / dotenv reader for backend/.dev.vars. */
function loadDevVars() {
  const here = dirname(fileURLToPath(import.meta.url))
  const path = resolve(here, '..', '.dev.vars')
  const vars = {}
  let raw
  try {
    raw = readFileSync(path, 'utf8')
  } catch {
    return vars
  }
  for (const line of raw.split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!match) continue
    let value = match[2].trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (value) vars[match[1]] = value
  }
  return vars
}

const fileVars = loadDevVars()
const env = (key) => process.env[key] ?? fileVars[key]

const [, , command = 'set', ...rest] = process.argv
const flags = new Map(
  rest
    .filter((arg) => arg.startsWith('--'))
    .map((arg) => {
      const [key, value] = arg.replace(/^--/, '').split('=')
      return [key, value ?? true]
    }),
)

if (command === '--help' || flags.has('help')) {
  console.log(
    [
      'commands: set [--url=<https url>] [--drop-pending] | info | delete',
      `webhook path: ${WEBHOOK_PATH}`,
    ].join('\n'),
  )
  process.exit(0)
}

const token = env('TELEGRAM_BOT_TOKEN')
if (!token) {
  console.error('Missing TELEGRAM_BOT_TOKEN (set it in the environment or backend/.dev.vars)')
  process.exit(1)
}

const call = async (method, body) => {
  // Never log `url`: it embeds the bot token.
  const res = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!json.ok) {
    throw new Error(`${method} failed: ${json.description ?? 'unknown error'}`)
  }
  return json.result
}

try {
  if (command === 'info') {
    const info = await call('getWebhookInfo')
    console.log(JSON.stringify(info, null, 2))
    if (!info.url) {
      console.error('No webhook is set — Telegram will not deliver callback updates.')
      process.exit(1)
    }
    if (!info.url.endsWith(WEBHOOK_PATH)) {
      console.error(`Webhook URL does not end with ${WEBHOOK_PATH}; check the deployment.`)
    }
  } else if (command === 'delete') {
    await call('setWebhook', { url: '' })
    console.log('Webhook cleared.')
  } else if (command === 'set') {
    const url = (flags.get('url') || env('TELEGRAM_WEBHOOK_URL') || '').toString()
    const secret = env('TELEGRAM_WEBHOOK_SECRET')
    if (!url.startsWith('https://')) {
      console.error(
        'Provide --url=https://<worker-domain>/v1/telegram/webhook (Telegram requires HTTPS).',
      )
      process.exit(1)
    }
    if (!url.endsWith(WEBHOOK_PATH)) {
      console.error(`Warning: URL does not end with ${WEBHOOK_PATH}.`)
    }
    if (!secret) {
      console.error(
        'Missing TELEGRAM_WEBHOOK_SECRET (Telegram echoes it as X-Telegram-Bot-Api-Secret-Token).',
      )
      process.exit(1)
    }
    await call('setWebhook', {
      url,
      secret_token: secret,
      ...(flags.has('drop-pending') ? { drop_pending_updates: true } : {}),
    })
    console.log(`Webhook set to ${url}`)
  } else {
    console.error(`Unknown command: ${command} (expected: set | info | delete)`)
    process.exit(1)
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
}
