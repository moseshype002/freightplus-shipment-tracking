import type { MovementStatus } from '../types/shipment';

export interface ShipmentProgressInput {
  movementStatus: MovementStatus;
  journeyStartedAt?: string | null;
  journeyDurationSeconds?: number;
  journeyPausedAt?: string | null;
  journeyPausedElapsedSeconds?: number;
  journeyProgressAtPause?: number;
}

export function calculateShipmentProgress(
  shipment: ShipmentProgressInput,
  now = Date.now(),
): number {
  const status = shipment.movementStatus;

  if (status === 'Delivered') return 100;
  if (status === 'Awaiting Dispatch') return 0;

  if (status === 'On Hold') {
    return Math.min(
      99,
      Math.max(0, shipment.journeyProgressAtPause ?? 0),
    );
  }

  if (status === 'Out for Delivery') return 99;

  if (status !== 'In Transit') return 0;

  const startTime = shipment.journeyStartedAt
    ? Date.parse(shipment.journeyStartedAt)
    : NaN;

  const duration = shipment.journeyDurationSeconds ?? 0;

  if (!Number.isFinite(startTime) || duration <= 0) {
    return Math.min(
      99,
      Math.max(0, shipment.journeyProgressAtPause ?? 0),
    );
  }

  const pausedAt = shipment.journeyPausedAt
    ? Date.parse(shipment.journeyPausedAt)
    : NaN;

  const currentPauseSeconds = Number.isFinite(pausedAt)
    ? Math.max(0, (now - pausedAt) / 1000)
    : 0;

  const pausedSeconds =
    Math.max(0, shipment.journeyPausedElapsedSeconds ?? 0) +
    currentPauseSeconds;

  const elapsedSeconds = Math.max(
    0,
    (now - startTime) / 1000 - pausedSeconds,
  );

  return Math.min(
    99,
    Math.max(0, Math.floor((elapsedSeconds / duration) * 100)),
  );
}