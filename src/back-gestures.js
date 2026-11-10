// Words and icons for each "go back" gesture, shared by the screens.

export const BACK_LABELS = {
  sad: { emoji: '🙁', name: 'SAD POUT', test: 'Optional: make a sad pout 🙁 (turn the corners of your mouth down) to go back', detected: 'Sad face detected!' },
  tilt: { emoji: '🙃', name: 'HEAD TILT 1s', test: 'Optional: tilt your head to the left 🙃 (ear towards shoulder) for about 1 second to go back', detected: 'Head tilt detected!' },
  eyes: { emoji: '😌', name: 'EYES CLOSED 1s', test: 'Optional: close your eyes for about 1 second 😌 to go back', detected: 'Eyes closed detected!' },
};

export const backLabel = (mode) => BACK_LABELS[mode] ?? BACK_LABELS.sad;
