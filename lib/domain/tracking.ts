import type { Prisma } from '@prisma/client';

const prefixes = { Problem: 'PRB', Project: 'PRJ', Unit: 'UNIT', Lesson: 'LES' } as const;

export function formatTrackingId(entity: keyof typeof prefixes, value: number) {
  return `${prefixes[entity]}-${String(value).padStart(6, '0')}`;
}

export async function nextTrackingId(tx: Prisma.TransactionClient, entity: keyof typeof prefixes) {
  const counter = await tx.trackingCounter.upsert({
    where: { entity }, create: { entity, value: 1 }, update: { value: { increment: 1 } },
  });
  return formatTrackingId(entity, counter.value);
}
