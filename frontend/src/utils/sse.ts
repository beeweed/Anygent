import type { StreamEnvelope } from '@/types';

export function extractSseEvents(buffer: string): {
  remaining: string;
  events: StreamEnvelope[];
} {
  const parts = buffer.split('\n\n');
  const remaining = parts.pop() ?? '';
  const events: StreamEnvelope[] = [];

  for (const rawPart of parts) {
    const lines = rawPart.split('\n');
    let event = 'message';
    let data = '';

    for (const line of lines) {
      if (line.startsWith('event:')) {
        event = line.slice(6).trim();
      }
      if (line.startsWith('data:')) {
        data += line.slice(5).trim();
      }
    }

    if (!data) continue;

    try {
      events.push({ event, data: JSON.parse(data) });
    } catch {
      events.push({ event, data: { raw: data } });
    }
  }

  return { remaining, events };
}