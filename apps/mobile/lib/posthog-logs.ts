import { Platform } from 'react-native'
import Constants from 'expo-constants'

/**
 * Lightweight OTLP log sender for PostHog Logs product.
 *
 * PostHog Logs uses the OpenTelemetry Protocol (OTLP) over HTTP.
 * Since there's no official RN OpenTelemetry SDK, we send logs
 * directly via the OTLP JSON endpoint.
 *
 * Logs are batched and flushed periodically or when the batch is full.
 */

const POSTHOG_TOKEN = process.env.EXPO_PUBLIC_POSTHOG_API_KEY
const OTLP_ENDPOINT = 'https://eu.i.posthog.com/i/v1/logs'
const BATCH_SIZE = 10
const FLUSH_INTERVAL_MS = 30_000

type SeverityText = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

const SEVERITY_MAP: Record<SeverityText, number> = {
  DEBUG: 5,
  INFO: 9,
  WARN: 13,
  ERROR: 17,
}

type LogRecord = {
  timeUnixNano: string
  severityNumber: number
  severityText: SeverityText
  body: { stringValue: string }
  attributes: Array<{
    key: string
    value: { stringValue?: string; intValue?: number; boolValue?: boolean }
  }>
}

let logBuffer: LogRecord[] = []
let flushTimer: ReturnType<typeof setInterval> | null = null

function getEnvironment(): string {
  if (__DEV__) return 'development'
  // EAS preview builds set this channel
  const channel = Constants.expoConfig?.extra?.eas?.updateUrl
  if (channel?.includes('preview')) return 'preview'
  return 'production'
}

const SERVICE_ATTRIBUTES = [
  { key: 'service.name', value: { stringValue: 'ptp-mobile' } },
  { key: 'deployment.environment', value: { stringValue: getEnvironment() } },
  { key: 'device.platform', value: { stringValue: Platform.OS } },
  {
    key: 'device.os.version',
    value: { stringValue: String(Platform.Version) },
  },
  {
    key: 'app.version',
    value: {
      stringValue: Constants.expoConfig?.version || '0.1.0',
    },
  },
]

function toAttribute(
  key: string,
  val: string | number | boolean | undefined,
): LogRecord['attributes'][0] | null {
  if (val === undefined || val === null || val === '') return null
  if (typeof val === 'number')
    return { key, value: { intValue: val } }
  if (typeof val === 'boolean')
    return { key, value: { boolValue: val } }
  return { key, value: { stringValue: String(val) } }
}

function buildLogRecord(
  level: SeverityText,
  message: string,
  attrs?: Record<string, string | number | boolean | undefined>,
): LogRecord {
  const attributes: LogRecord['attributes'] = []
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      const attr = toAttribute(k, v)
      if (attr) attributes.push(attr)
    }
  }

  return {
    timeUnixNano: String(Date.now() * 1_000_000),
    severityNumber: SEVERITY_MAP[level],
    severityText: level,
    body: { stringValue: message },
    attributes,
  }
}

async function flushLogs() {
  if (logBuffer.length === 0 || !POSTHOG_TOKEN) return

  const records = logBuffer.splice(0)

  const payload = {
    resourceLogs: [
      {
        resource: { attributes: SERVICE_ATTRIBUTES },
        scopeLogs: [
          {
            scope: { name: 'ptp-mobile' },
            logRecords: records,
          },
        ],
      },
    ],
  }

  try {
    await fetch(OTLP_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${POSTHOG_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  } catch {
    // Silently drop — logging should never crash the app
  }
}

function ensureFlushTimer() {
  if (flushTimer) return
  flushTimer = setInterval(() => {
    flushLogs()
  }, FLUSH_INTERVAL_MS)
}

/**
 * Emit a structured log to PostHog Logs via OTLP.
 *
 * Use this for developer-facing debugging logs (all environments).
 * Debug/info logs in preview builds become searchable in PostHog Logs UI.
 */
export function emitLog(
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  attributes?: Record<string, string | number | boolean | undefined>,
) {
  if (!POSTHOG_TOKEN) return

  const severityText = level.toUpperCase() as SeverityText
  logBuffer.push(buildLogRecord(severityText, message, attributes))
  ensureFlushTimer()

  if (logBuffer.length >= BATCH_SIZE) {
    flushLogs()
  }
}

/** Force flush pending logs — call on app background/unmount */
export async function flushPendingLogs() {
  if (flushTimer) {
    clearInterval(flushTimer)
    flushTimer = null
  }
  await flushLogs()
}
