export default function HeroIllustration({
  className = 'w-full max-w-[520px] mx-auto'
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 520 320"
      className={`${className} drop-shadow-[0_20px_40px_rgba(0,0,0,0.35)]`}
      role="img"
      aria-label="Open glowing Bible and hymnal with musical notes and a lightbulb"
    >
      <defs>
        <radialGradient id="halo" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#FACC15" stopOpacity="0.45" />
          <stop offset="55%" stopColor="#F43F5E" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#6D28D9" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pageL" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E9E4FF" />
        </linearGradient>
        <linearGradient id="pageR" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#DCD4FA" />
        </linearGradient>
        <linearGradient id="cover" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#431888" />
        </linearGradient>
        <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <linearGradient id="notebook" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F43F5E" />
          <stop offset="100%" stopColor="#9F1239" />
        </linearGradient>
        <linearGradient id="bulb" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FEF3C7" />
          <stop offset="100%" stopColor="#FACC15" />
        </linearGradient>
        <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* warm glow halo */}
      <ellipse cx="260" cy="170" rx="230" ry="140" fill="url(#halo)" />
      <circle cx="260" cy="180" r="96" fill="#FACC15" opacity="0.18" filter="url(#soft)" />

      {/* light rays */}
      <g stroke="#FACC15" strokeOpacity="0.5" strokeWidth="3" strokeLinecap="round">
        <line x1="260" y1="26" x2="260" y2="44" />
        <line x1="300" y1="36" x2="290" y2="52" />
        <line x1="220" y1="36" x2="230" y2="52" />
        <line x1="330" y1="66" x2="315" y2="76" />
        <line x1="190" y1="66" x2="205" y2="76" />
      </g>

      {/* lightbulb accent */}
      <g transform="translate(260 66)">
        <circle r="30" fill="#FACC15" opacity="0.25" filter="url(#soft)" />
        <path
          d="M0 -26c-13 0-23 10-23 22 0 8 4 13 8 17 3 3 4 6 4 9h22c0-3 1-6 4-9 4-4 8-9 8-17 0-12-10-22-23-22z"
          fill="url(#bulb)"
          stroke="#F59E0B"
          strokeWidth="2"
        />
        <rect x="-11" y="24" width="22" height="5" rx="2.5" fill="#B45309" />
        <rect x="-8" y="30" width="16" height="4" rx="2" fill="#92400E" />
        <path d="M-7 4c0-5 3-8 7-10 4 2 7 5 7 10" stroke="#F59E0B" strokeWidth="2" fill="none" />
      </g>

      {/* Bible shadow */}
      <ellipse cx="235" cy="268" rx="140" ry="16" fill="#2A0B57" opacity="0.55" />

      {/* Bible cover (flat-3D side) */}
      <path d="M100 228 L235 250 L235 268 L100 246 Z" fill="#3B1277" />
      <path d="M370 228 L235 250 L235 268 L370 246 Z" fill="#320F66" />

      {/* left page block */}
      <path d="M104 128c40-14 88-16 131-2v118c-43-14-91-12-131 2z" fill="url(#pageL)" />
      <path d="M104 128c40-14 88-16 131-2v118c-43-14-91-12-131 2z" fill="none" stroke="#C7BEF5" strokeWidth="2" />
      {/* right page block */}
      <path d="M366 128c-40-14-88-16-131-2v118c43-14 91-12 131 2z" fill="url(#pageR)" />
      <path d="M366 128c-40-14-88-16-131-2v118c43-14 91-12 131 2z" fill="none" stroke="#C7BEF5" strokeWidth="2" />

      {/* page text lines */}
      <g stroke="#8B7BC7" strokeWidth="5" strokeLinecap="round" opacity="0.55">
        <line x1="128" y1="150" x2="215" y2="144" />
        <line x1="128" y1="166" x2="222" y2="160" />
        <line x1="128" y1="182" x2="205" y2="177" />
        <line x1="128" y1="198" x2="220" y2="192" />
        <line x1="128" y1="214" x2="196" y2="209" />

        <line x1="392" y1="150" x2="305" y2="144" />
        <line x1="392" y1="166" x2="298" y2="160" />
        <line x1="392" y1="182" x2="315" y2="177" />
        <line x1="392" y1="198" x2="300" y2="192" />
        <line x1="392" y1="214" x2="324" y2="209" />
      </g>

      {/* gold gilded page edges */}
      <path d="M104 128c40-14 88-16 131-2v118c-43-14-91-12-131 2z" fill="none" stroke="url(#gold)" strokeWidth="3" />

      {/* spine highlight */}
      <path d="M228 124h14v126h-14z" fill="#FDE68A" opacity="0.9" />
      <path d="M232 122h6v130h-6z" fill="#FFFFFF" opacity="0.55" />

      {/* ribbon bookmark */}
      <path d="M300 240l14 40 -14-10 -14 10z" fill="#F43F5E" />

      {/* hymnal notebook, tilted on the right */}
      <g transform="translate(400 196) rotate(12)">
        <rect x="-56" y="-58" width="104" height="116" rx="10" fill="url(#notebook)" />
        <rect x="-44" y="-46" width="80" height="92" rx="6" fill="#FFF7ED" />
        <g stroke="#9F1239" strokeWidth="2" opacity="0.45">
          <line x1="-36" y1="-30" x2="28" y2="-30" />
          <line x1="-36" y1="-18" x2="20" y2="-18" />
          <line x1="-36" y1="-6" x2="26" y2="-6" />
          <line x1="-36" y1="6" x2="12" y2="6" />
          <line x1="-36" y1="18" x2="24" y2="18" />
          <line x1="-36" y1="30" x2="16" y2="30" />
        </g>
        {/* spiral binding */}
        <g stroke="#FDE68A" strokeWidth="4" strokeLinecap="round">
          <line x1="-44" y1="-40" x2="-58" y2="-40" />
          <line x1="-44" y1="-20" x2="-58" y2="-20" />
          <line x1="-44" y1="0" x2="-58" y2="0" />
          <line x1="-44" y1="20" x2="-58" y2="20" />
          <line x1="-44" y1="40" x2="-58" y2="40" />
        </g>
      </g>

      {/* musical notes */}
      <g fill="#FACC15">
        <g transform="translate(92 78) rotate(-12)">
          <ellipse cx="0" cy="0" rx="11" ry="8.5" transform="rotate(-18)" />
          <rect x="9" y="-42" width="4.5" height="44" rx="2" />
          <path d="M13.5 -42c12 2 18 8 17 20-3-9-9-12-17-13z" />
        </g>
        <g transform="translate(438 84) rotate(10)" fill="#F43F5E">
          <ellipse cx="0" cy="0" rx="9" ry="7" transform="rotate(-18)" />
          <rect x="7" y="-34" width="4" height="36" rx="2" />
          <path d="M11 -34c10 2 15 7 14 17-3-8-8-10-14-11z" />
        </g>
        <g transform="translate(360 46) rotate(6)" fill="#FDE68A">
          <ellipse cx="0" cy="0" rx="7.5" ry="6" transform="rotate(-18)" />
          <rect x="6" y="-28" width="3.5" height="30" rx="1.8" />
        </g>
        <g transform="translate(160 44) rotate(-6)" fill="#FDE68A">
          <ellipse cx="0" cy="0" rx="7" ry="5.5" transform="rotate(-18)" />
          <rect x="5.5" y="-26" width="3.5" height="28" rx="1.8" />
        </g>
      </g>

      {/* sparkles */}
      <g fill="#FFFFFF" opacity="0.85">
        <circle cx="212" cy="104" r="3" />
        <circle cx="318" cy="112" r="2.5" />
        <circle cx="140" cy="248" r="2.5" />
        <circle cx="368" cy="252" r="2.5" />
        <path d="M300 92l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
      </g>
    </svg>
  );
}