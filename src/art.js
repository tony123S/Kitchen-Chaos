// Hand-made SVG illustrations: the chef mascot and the food pictures.
// Everything is drawn in code, so there are no image licences to worry about.

/** The Kitchen Chaos chef, "Chef Pip". `mood` changes the face. */
export function chefSvg(mood = 'idle') {
  const mouths = {
    idle: '<path d="M88 132 q12 10 24 0" stroke="#5a3415" stroke-width="4" fill="none" stroke-linecap="round"/>',
    happy: '<path d="M84 128 q16 22 32 0 z" fill="#8a2f1b"/><path d="M90 136 q10 7 20 0" fill="#ff8a7a"/>',
    surprised: '<ellipse cx="100" cy="134" rx="8" ry="10" fill="#8a2f1b"/>',
    confused: '<path d="M88 136 q6 -6 12 0 t12 0" stroke="#5a3415" stroke-width="4" fill="none" stroke-linecap="round"/>',
    victory: '<path d="M82 126 q18 26 36 0 z" fill="#8a2f1b"/><path d="M90 138 q10 8 20 0" fill="#ff8a7a"/>',
  };
  const eyes = {
    surprised: '<circle cx="84" cy="112" r="7" fill="#3b2a1a"/><circle cx="116" cy="112" r="7" fill="#3b2a1a"/>',
    happy: '<path d="M77 113 q7 -8 14 0" stroke="#3b2a1a" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M109 113 q7 -8 14 0" stroke="#3b2a1a" stroke-width="4" fill="none" stroke-linecap="round"/>',
    victory: '<path d="M77 113 q7 -8 14 0" stroke="#3b2a1a" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M109 113 q7 -8 14 0" stroke="#3b2a1a" stroke-width="4" fill="none" stroke-linecap="round"/>',
  };
  const brows = mood === 'confused'
    ? '<path d="M76 98 l14 4" stroke="#5a3415" stroke-width="4" stroke-linecap="round"/><path d="M110 102 l14 -6" stroke="#5a3415" stroke-width="4" stroke-linecap="round"/>'
    : '';
  const defaultEyes = '<circle cx="84" cy="113" r="5.5" fill="#3b2a1a"/><circle cx="116" cy="113" r="5.5" fill="#3b2a1a"/><circle cx="86" cy="111" r="1.8" fill="#fff"/><circle cx="118" cy="111" r="1.8" fill="#fff"/>';
  return `
<svg class="chef chef-${mood}" viewBox="0 0 200 230" role="img" aria-label="Chef Pip, the Kitchen Chaos mascot, looking ${mood}">
  <ellipse cx="100" cy="222" rx="58" ry="7" fill="#000" opacity="0.08"/>
  <path d="M52 230 q0 -58 48 -62 q48 4 48 62 z" fill="#ffffff" stroke="#e7d6c2" stroke-width="3"/>
  <path d="M92 172 l8 14 l8 -14" fill="#f28c28"/>
  <circle cx="100" cy="196" r="3.5" fill="#e7d6c2"/><circle cx="100" cy="212" r="3.5" fill="#e7d6c2"/>
  <circle cx="100" cy="120" r="44" fill="#ffd9b0"/>
  <circle cx="70" cy="128" r="7" fill="#ffb59a" opacity="0.7"/><circle cx="130" cy="128" r="7" fill="#ffb59a" opacity="0.7"/>
  ${eyes[mood] ?? defaultEyes}
  ${brows}
  ${mouths[mood] ?? mouths.idle}
  <path d="M60 86 q-18 -30 12 -40 q8 -26 28 -22 q20 -4 28 22 q30 10 12 40 z" fill="#ffffff" stroke="#e7d6c2" stroke-width="3"/>
  <rect x="62" y="80" width="76" height="14" rx="5" fill="#ffffff" stroke="#e7d6c2" stroke-width="3"/>
</svg>`;
}

const FOOD = {
  pancakes: `
<svg viewBox="0 0 240 160" role="img" aria-label="A stack of fluffy pancakes with syrup and berries">
  <rect width="240" height="160" fill="#ffe7c2"/>
  <ellipse cx="120" cy="132" rx="92" ry="16" fill="#fff" stroke="#efd9bd" stroke-width="3"/>
  <ellipse cx="120" cy="120" rx="66" ry="14" fill="#d98a3a"/>
  <ellipse cx="120" cy="112" rx="66" ry="14" fill="#f2b25c"/>
  <ellipse cx="120" cy="100" rx="66" ry="14" fill="#d98a3a"/>
  <ellipse cx="120" cy="92" rx="66" ry="14" fill="#f2b25c"/>
  <ellipse cx="120" cy="80" rx="66" ry="14" fill="#d98a3a"/>
  <ellipse cx="120" cy="72" rx="66" ry="14" fill="#f6c477"/>
  <path d="M74 70 q20 -10 46 -6 q30 -2 44 8 q-6 12 -12 8 q-4 18 -10 2 q-14 6 -30 2 q-6 16 -12 0 q-14 2 -26 -14z" fill="#9b4a12" opacity="0.85"/>
  <rect x="110" y="56" width="20" height="12" rx="3" fill="#fff4d6"/>
  <circle cx="160" cy="62" r="7" fill="#c8213c"/><circle cx="168" cy="70" r="6" fill="#4a3aa8"/>
  <circle cx="76" cy="64" r="6" fill="#4a3aa8"/><circle cx="84" cy="58" r="6.5" fill="#c8213c"/>
</svg>`,
  spaghetti: `
<svg viewBox="0 0 240 160" role="img" aria-label="A bowl of spaghetti bolognese with cheese">
  <rect width="240" height="160" fill="#ffe0d0"/>
  <ellipse cx="120" cy="96" rx="96" ry="40" fill="#ffffff" stroke="#efd2c2" stroke-width="3"/>
  <ellipse cx="120" cy="92" rx="76" ry="28" fill="#f3d27a"/>
  <g stroke="#e8b84c" stroke-width="3" fill="none" stroke-linecap="round">
    <path d="M58 92 q20 -16 40 0 t40 0 t36 -4"/><path d="M64 100 q22 -14 44 0 t44 0"/>
    <path d="M70 84 q18 -12 36 0 t40 -2"/><path d="M80 108 q20 -8 40 0 t36 -2"/>
  </g>
  <path d="M84 84 q36 -26 72 0 q-8 16 -36 16 q-28 0 -36 -16z" fill="#b8361e"/>
  <g fill="#7a2410"><circle cx="104" cy="82" r="4"/><circle cx="122" cy="76" r="4"/><circle cx="138" cy="84" r="4"/><circle cx="114" cy="90" r="3.5"/></g>
  <g fill="#fff6dc"><rect x="108" y="70" width="5" height="3"/><rect x="128" y="80" width="5" height="3"/><rect x="118" y="86" width="5" height="3"/><rect x="100" y="78" width="4" height="3"/></g>
  <path d="M142 66 q8 -8 14 0 q-6 6 -14 0z" fill="#3a9d5d"/>
  <rect x="176" y="40" width="6" height="58" rx="3" transform="rotate(20 179 69)" fill="#b0b0b0"/>
</svg>`,
};

export function foodSvg(name) {
  return FOOD[name] ?? '';
}

/** Small pictures for the four "How to Use" steps. */
export const HOWTO_ART = {
  choose: `<svg viewBox="0 0 120 90" aria-hidden="true"><rect x="10" y="14" width="46" height="62" rx="10" fill="#fff" stroke="#f28c28" stroke-width="3"/><rect x="64" y="14" width="46" height="62" rx="10" fill="#fff" stroke="#e7d6c2" stroke-width="3"/><ellipse cx="33" cy="40" rx="15" ry="6" fill="#f2b25c"/><ellipse cx="33" cy="34" rx="15" ry="6" fill="#d98a3a"/><ellipse cx="87" cy="38" rx="16" ry="9" fill="#b8361e"/><path d="M22 62 h22 M76 62 h22" stroke="#e7d6c2" stroke-width="4" stroke-linecap="round"/><circle cx="50" cy="70" r="9" fill="#3a9d5d"/><path d="M45 70 l4 4 l7 -8" stroke="#fff" stroke-width="3" fill="none"/></svg>`,
  camera: `<svg viewBox="0 0 120 90" aria-hidden="true"><rect x="18" y="12" width="84" height="56" rx="8" fill="#3b2a1a"/><rect x="24" y="18" width="72" height="44" rx="4" fill="#ffe7c2"/><circle cx="60" cy="40" r="11" fill="#ffd9b0"/><circle cx="56" cy="38" r="1.8" fill="#3b2a1a"/><circle cx="64" cy="38" r="1.8" fill="#3b2a1a"/><path d="M55 44 q5 4 10 0" stroke="#3b2a1a" stroke-width="2" fill="none"/><circle cx="60" cy="15" r="2" fill="#3a9d5d"/><rect x="40" y="70" width="40" height="6" rx="3" fill="#3b2a1a"/></svg>`,
  read: `<svg viewBox="0 0 120 90" aria-hidden="true"><rect x="16" y="10" width="88" height="70" rx="10" fill="#fff" stroke="#e7d6c2" stroke-width="3"/><rect x="26" y="20" width="40" height="8" rx="4" fill="#f28c28"/><path d="M26 40 h68 M26 52 h68 M26 64 h44" stroke="#c9b39b" stroke-width="5" stroke-linecap="round"/></svg>`,
  control: `<svg viewBox="0 0 120 90" aria-hidden="true"><circle cx="38" cy="45" r="26" fill="#ffd9b0"/><circle cx="30" cy="40" r="3" fill="#3b2a1a"/><circle cx="46" cy="40" r="3" fill="#3b2a1a"/><path d="M26 52 q12 12 24 0" stroke="#3b2a1a" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M72 45 h30" stroke="#f28c28" stroke-width="6" stroke-linecap="round"/><path d="M92 33 l12 12 l-12 12" stroke="#f28c28" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};
