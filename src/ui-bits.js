// Small UI helpers shared by the setup and cooking screens.

export const $ = (id) => document.getElementById(id);

// The five statuses the brief asks for, in plain words.
export function statusText(status, { faceOk, errorKind } = {}) {
  if (status === 'error') return errorKind === 'sdk' ? 'SDK connection error' : 'Camera unavailable';
  if (status === 'starting') return 'Starting camera...';
  if (status === 'detected') return 'Expression detected!';
  if (status === 'running') return faceOk ? 'Detecting expression' : 'Camera ready';
  return 'Camera off';
}

export function showPreview(videoId, emptyId, stream, emptyText) {
  const video = $(videoId);
  video.srcObject = stream;
  video.hidden = !stream;
  if (stream) video.play().catch(() => {});
  $(emptyId).hidden = Boolean(stream);
  if (emptyText) $(emptyId).textContent = emptyText;
}

export function setBar(fill, value) {
  if (fill) fill.style.width = `${Math.max(0, Math.min(100, value ?? 0))}%`;
}
