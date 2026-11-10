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
 * @returns {{faceOk: boolean, stable: boolean, scores: Record<string, number>, roll: number|null} | null}
 */
// MediaPipe face mesh indices (SmartSpectra uses the same 478-point layout):
// 33 = outer corner of one eye, 263 = outer corner of the other eye.
const EYE_A = 33;
const EYE_B = 263;

/** Head roll in degrees from the line between the outer eye corners (0 = upright). */
export function headRoll(points) {
  if (!points || points.length <= EYE_B) return null;
  const a = points[EYE_A];
  const b = points[EYE_B];
  if (!a || !b) return null;
  const dx = (b.x ?? 0) - (a.x ?? 0);
  const dy = (b.y ?? 0) - (a.y ?? 0);
  if (dx === 0 && dy === 0) return null;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

export function readExpression(buf, faceOk) {
  const metrics = decodeMetrics(buf);
  const marks = metrics?.face?.landmarks;
  const roll = marks && marks.length ? headRoll(marks[marks.length - 1].value) : null;
  const list = metrics?.face?.expression;
  if (!list || list.length === 0) {
    // Packets with only landmarks still matter for the head-tilt control.
    return roll === null ? null : { faceOk, stable: false, scores: null, roll };
  }
  const latest = list[list.length - 1];
  const scores = {};
  for (const score of latest.scores ?? []) {
    scores[expressionName(score.type)] = score.confidence ?? 0;
  }
  return { faceOk, stable: Boolean(latest.stable), scores, roll };
}
