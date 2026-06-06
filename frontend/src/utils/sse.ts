import type { StreamEnvelope } from '@/types/chat'

export function parseSseBuffer(buffer: string) {
  const chunks = buffer.split('\n\n')
  const complete = chunks.slice(0, -1)
  const remainder = chunks.at(-1) ?? ''
  const events: StreamEnvelope[] = []

  for (const chunk of complete) {
    const dataLines = chunk
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())

    if (!dataLines.length) {
      continue
    }

    try {
      events.push(JSON.parse(dataLines.join('\n')) as StreamEnvelope)
    } catch {
      // Ignore malformed chunks and continue streaming.
    }
  }

  return { events, remainder }
}