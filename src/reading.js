// Turns one SmartSpectra metrics packet into a simple expression reading.
// Kept apart from camera.js so it can be unit-tested without a camera.

import messages from '@smartspectra/node-sdk/messages';

const { decodeMetrics, presage } = messages;
const ExpressionType = presage.smartspectra.ExpressionType;

export function expressionName(type) {
  return ExpressionType[type] ?? `TYPE_${type}`;
}

/**
 * Pulls the newest expression scores out of one metrics packet.
 * @returns {{faceOk: boolean, stable: boolean, scores: Record<string, number>, eyesClosed: boolean|null} | null}
 */
export function readExpression(buf, faceOk) {
  const metrics = decodeMetrics(buf);
  const list = metrics?.face?.expression;
  const blinks = metrics?.face?.blinking;
  // Latest SDK blink status in this packet: true, false, or null if none sent.
  const eyesClosed = blinks && blinks.length ? Boolean(blinks[blinks.length - 1].detected) : null;
  if (!list || list.length === 0) return null;
  const latest = list[list.length - 1];
  const scores = {};
  for (const score of latest.scores ?? []) {
    scores[expressionName(score.type)] = score.confidence ?? 0;
  }
  return { faceOk, stable: Boolean(latest.stable), scores, eyesClosed };
}
