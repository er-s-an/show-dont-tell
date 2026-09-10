/** Shared SVG icon set (24x24 stroke, Lucide-style) + illustration scenes. */

export const SVG = (paths: string, filled = false) =>
  `<svg viewBox="0 0 24 24" ${filled ? 'fill="currentColor" stroke="none"' : 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'}>${paths}</svg>`;

export const ICONS: Record<string, string> = {
  drive: SVG('<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.7A2 2 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>'),
  food: SVG('<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>'),
  wine: SVG('<path d="M8 22h8"/><path d="M7 10h10"/><path d="M12 15v7"/><path d="M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z"/>'),
  hotel: SVG('<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>'),
  coffee: SVG('<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/>'),
  balloon: SVG('<path d="M12 2a6 6 0 0 1 6 6c0 3.5-2.5 6.5-4.2 8H10.2C8.5 14.5 6 11.5 6 8a6 6 0 0 1 6-6Z"/><path d="M10 16l-1 4h6l-1-4"/><path d="M9 20h6"/>'),
  calendar: SVG('<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>'),
  pin: SVG('<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>'),
  star: SVG('<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>', true),
  paw: SVG('<path d="M12 21c-4.5 0-7-2.5-7-5.5 0-2.2 1.6-4 3.5-4 1.1 0 1.9.6 3.5.6s2.4-.6 3.5-.6c1.9 0 3.5 1.8 3.5 4 0 3-2.5 5.5-7 5.5Z"/><circle cx="7.5" cy="8" r="1.4"/><circle cx="16.5" cy="8" r="1.4"/><circle cx="10" cy="5.5" r="1.4"/><circle cx="14" cy="5.5" r="1.4"/>'),
  check: SVG('<path d="M20 6 9 17l-5-5"/>'),
  x: SVG('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
  shield: SVG('<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>'),
  arrow: SVG('<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>'),
  receipt: SVG('<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h5"/>'),
};

export const HERO_SCENE = `
<svg class="scene" viewBox="0 0 780 188" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FDEFC9"/><stop offset="1" stop-color="#F5B56B"/>
    </linearGradient>
    <radialGradient id="sunglow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#FFF6DC" stop-opacity="0.95"/><stop offset="1" stop-color="#FFF6DC" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="780" height="188" fill="url(#sky)"/>
  <circle cx="586" cy="66" r="64" fill="url(#sunglow)"/>
  <circle cx="586" cy="66" r="26" fill="#FFF4D2"/>
  <g transform="translate(150,40)">
    <path d="M0,-22 C-14,-22 -20,-10 -20,-2 C-20,8 -12,16 -6,20 L6,20 C12,16 20,8 20,-2 C20,-10 14,-22 0,-22 Z" fill="#D95D44"/>
    <path d="M0,-22 C-5,-22 -8,-10 -8,-2 C-8,8 -5,16 -3,20 L3,20 C5,16 8,8 8,-2 C8,-10 5,-22 0,-22 Z" fill="#F7E8C9"/>
    <path d="M-6,20 L-4,26 L4,26 L6,20" fill="none" stroke="#8a5a3a" stroke-width="1.2"/>
    <rect x="-4.5" y="26" width="9" height="6" rx="1.5" fill="#8a5a3a"/>
  </g>
  <g stroke="#9c7040" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.7">
    <path d="M430,52 q4,-4 8,0 q4,-4 8,0"/>
    <path d="M468,40 q3,-3 6,0 q3,-3 6,0"/>
  </g>
  <path d="M0,104 Q150,82 310,98 Q470,112 620,92 Q710,84 780,94 L780,188 L0,188 Z" fill="#DCA96E" opacity="0.6"/>
  <path d="M0,126 Q190,102 390,120 Q590,136 780,112 L780,188 L0,188 Z" fill="#9BA85F" opacity="0.9"/>
  <path d="M0,150 Q240,128 470,142 Q640,152 780,138 L780,188 L0,188 Z" fill="#6E8A4C"/>
  <g stroke="#556F38" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.85">
    <path d="M60,160 Q240,140 460,152" stroke-dasharray="1 7"/>
    <path d="M40,170 Q250,150 480,162" stroke-dasharray="1 7"/>
    <path d="M20,180 Q260,160 500,172" stroke-dasharray="1 7"/>
    <path d="M500,148 Q640,156 760,144" stroke-dasharray="1 7"/>
    <path d="M510,158 Q650,166 770,154" stroke-dasharray="1 7"/>
  </g>
  <path d="M-10,190 C120,176 210,166 300,152 C340,146 380,144 420,146" fill="none" stroke="#F3E7C6" stroke-width="8" stroke-linecap="round"/>
  <g fill="#47613B">
    <path d="M508,148 c-5,-14 -5,-26 0,-36 c5,10 5,22 0,36 Z"/>
    <path d="M530,152 c-4,-11 -4,-21 0,-29 c4,8 4,18 0,29 Z"/>
    <path d="M120,168 c-4,-11 -4,-21 0,-29 c4,8 4,18 0,29 Z"/>
  </g>
</svg>`;

export const HOTEL_SCENES: Record<string, string> = {
  vineyard: `<svg viewBox="0 0 260 74" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="hv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F8D9A0"/><stop offset="1" stop-color="#E8934F"/></linearGradient></defs>
    <rect width="260" height="74" fill="url(#hv)"/>
    <circle cx="200" cy="26" r="13" fill="#FFF2CE"/>
    <path d="M0,44 Q70,32 140,42 Q210,50 260,40 L260,74 L0,74 Z" fill="#7C9150"/>
    <g stroke="#5E7640" stroke-width="1.6" stroke-dasharray="1 5" stroke-linecap="round" fill="none">
      <path d="M20,52 Q90,42 170,50"/><path d="M12,60 Q100,50 190,58"/><path d="M4,68 Q110,58 210,66"/>
    </g>
  </svg>`,
  downtown: `<svg viewBox="0 0 260 74" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="hd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F2B8A0"/><stop offset="1" stop-color="#C97B72"/></linearGradient></defs>
    <rect width="260" height="74" fill="url(#hd)"/>
    <circle cx="52" cy="22" r="11" fill="#FFE3C2"/>
    <g fill="#4A3F55">
      <rect x="20" y="34" width="26" height="40"/><rect x="54" y="24" width="20" height="50"/>
      <rect x="82" y="40" width="30" height="34"/><rect x="120" y="28" width="22" height="46"/>
      <rect x="150" y="38" width="28" height="36"/><rect x="186" y="22" width="20" height="52"/><rect x="214" y="36" width="26" height="38"/>
    </g>
    <g fill="#FFD98F" opacity="0.9">
      <rect x="26" y="40" width="4" height="5"/><rect x="34" y="40" width="4" height="5"/><rect x="26" y="50" width="4" height="5"/>
      <rect x="58" y="30" width="4" height="5"/><rect x="64" y="38" width="4" height="5"/><rect x="126" y="34" width="4" height="5"/>
      <rect x="192" y="28" width="4" height="5"/><rect x="192" y="38" width="4" height="5"/><rect x="220" y="42" width="4" height="5"/>
    </g>
  </svg>`,
  river: `<svg viewBox="0 0 260 74" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="hr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#CFE9D8"/><stop offset="1" stop-color="#8CC4B2"/></linearGradient></defs>
    <rect width="260" height="74" fill="url(#hr)"/>
    <path d="M0,30 Q80,20 150,28 Q220,36 260,26 L260,44 Q200,52 140,46 Q70,38 0,48 Z" fill="#5FA8BC"/>
    <path d="M0,30 Q80,20 150,28 Q220,36 260,26" fill="none" stroke="#EAF6F0" stroke-width="2.5"/>
    <g fill="#3F6B4A">
      <path d="M30,30 c-6,-16 -6,-30 0,-42 c6,12 6,26 0,42 Z"/>
      <path d="M210,26 c-5,-13 -5,-25 0,-35 c5,10 5,22 0,35 Z"/>
      <circle cx="64" cy="24" r="10"/><circle cx="76" cy="20" r="8"/>
      <circle cx="182" cy="22" r="9"/><circle cx="193" cy="18" r="7"/>
    </g>
    <path d="M0,48 Q70,38 140,46 Q200,52 260,44 L260,74 L0,74 Z" fill="#6E8A4C"/>
  </svg>`,
};
