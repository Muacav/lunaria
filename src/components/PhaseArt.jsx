import { useId } from 'react';

// Original illustrations for each cycle phase, drawn as the life of a
// lunaria plant (the "moonwort", whose seed pods look like little moons):
//   period      a flower letting its petals fall
//   follicular  a new bud
//   fertile     the flower opening
//   ovulation   full bloom in the sun
//   luteal      silver moon-shaped seed pods
//   late        a crescent moon keeping watch
// Colours come from the theme tokens, so every drawing follows light and
// dark mode. Motion is gentle and stops when the phone asks for less motion.

const leafD = (l, w) => `M0 0 C ${w} ${-l * 0.28} ${w} ${-l * 0.72} 0 ${-l} C ${-w} ${-l * 0.72} ${-w} ${-l * 0.28} 0 0Z`;
const petalD = (l, w) =>
  `M0 0 C ${w * 0.9} ${-l * 0.15} ${w * 1.15} ${-l * 0.8} 0 ${-l} C ${-w * 1.15} ${-l * 0.8} ${-w * 0.9} ${-l * 0.15} 0 0Z`;

function Leaf({ x, y, a, l = 30, w = 10, tone = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${a})`}>
      <path d={leafD(l, w)} fill={tone === 1 ? 'var(--leaf)' : 'var(--leaf-2)'} />
      <path d={`M0 -2 L0 ${-l * 0.82}`} stroke="var(--leaf-vein)" strokeWidth="1" strokeLinecap="round" />
    </g>
  );
}

function Petal({ x, y, a, l, w, fill, opacity = 1, className }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${a})`} className={className}>
      <path d={petalD(l, w)} fill={fill} opacity={opacity} />
    </g>
  );
}

function Flower({ x, y, n, l, w, fill, start = 0, spread = 360, opacity = 1 }) {
  const step = spread === 360 ? 360 / n : spread / (n - 1);
  return Array.from({ length: n }, (_, i) => (
    <Petal key={i} x={x} y={y} a={start + i * step} l={l} w={w} fill={fill} opacity={opacity} />
  ));
}

function Stem({ d }) {
  return <path d={d} fill="none" stroke="var(--leaf)" strokeWidth="2.6" strokeLinecap="round" />;
}

function Pod({ x, y, r, delay = 0 }) {
  return (
    <g className="art-float" style={{ animationDelay: `${delay}s` }}>
      <circle cx={x} cy={y} r={r} fill="var(--pod)" stroke="var(--luteal)" strokeWidth="1.4" />
      <circle cx={x} cy={y} r={r - 3.5} fill="none" stroke="var(--luteal)" strokeOpacity="0.25" strokeWidth="1" />
      <ellipse cx={x - r * 0.32} cy={y - r * 0.1} rx={r * 0.16} ry={r * 0.24} fill="var(--luteal)" opacity="0.55" />
      <ellipse cx={x + r * 0.28} cy={y - r * 0.25} rx={r * 0.15} ry={r * 0.22} fill="var(--luteal)" opacity="0.45" />
      <ellipse cx={x + r * 0.05} cy={y + r * 0.35} rx={r * 0.16} ry={r * 0.23} fill="var(--luteal)" opacity="0.5" />
      <path d={`M${x - r * 0.55} ${y - r * 0.55} A ${r * 0.8} ${r * 0.8} 0 0 1 ${x + r * 0.1} ${y - r * 0.82}`} fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="1.6" strokeLinecap="round" />
    </g>
  );
}

function Spark({ x, y, s = 1, delay = 0, color = 'var(--phase)' }) {
  return (
    <path
      className="art-twinkle"
      style={{ animationDelay: `${delay}s` }}
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 -6 C 1 -1 1 -1 6 0 C 1 1 1 1 0 6 C -1 1 -1 1 -6 0 C -1 -1 -1 -1 0 -6Z"
      fill={color}
    />
  );
}

function Backdrop() {
  return (
    <>
      <circle cx="100" cy="98" r="84" fill="var(--phase-soft)" />
      <circle cx="100" cy="98" r="94" fill="none" stroke="var(--phase)" strokeOpacity="0.28" strokeWidth="1.4" strokeDasharray="0.5 6" strokeLinecap="round" />
    </>
  );
}

function Follicular() {
  return (
    <>
      <g className="art-sway">
        <Stem d="M100 192 C 97 165 104 132 100 104" />
        <Leaf x={100} y={164} a={-52} l={36} w={11} />
        <Leaf x={101} y={142} a={50} l={30} w={10} tone={2} />
        <Leaf x={100} y={106} a={-38} l={16} w={6} />
        <Leaf x={100} y={106} a={38} l={16} w={6} />
        <Petal x={100} y={106} a={-15} l={36} w={12} fill="var(--follicular)" opacity={0.75} />
        <Petal x={100} y={106} a={15} l={36} w={12} fill="var(--follicular)" opacity={0.75} />
        <Petal x={100} y={106} a={0} l={42} w={13} fill="var(--follicular)" />
      </g>
      <Spark x={58} y={72} s={0.9} delay={0} />
      <Spark x={146} y={62} s={0.7} delay={1.1} />
      <Spark x={150} y={118} s={0.55} delay={2} />
    </>
  );
}

function Fertile() {
  return (
    <>
      <g className="art-sway">
        <Stem d="M100 192 C 95 163 106 128 100 100" />
        <Leaf x={99} y={166} a={-56} l={38} w={12} />
        <Leaf x={102} y={144} a={52} l={32} w={10} tone={2} />
        <Flower x={100} y={96} n={5} l={44} w={12} fill="var(--fertile)" start={-64} spread={128} opacity={0.4} />
        <Flower x={100} y={96} n={6} l={38} w={13} fill="var(--fertile)" start={-75} spread={150} />
        <circle cx="100" cy="94" r="8" fill="var(--ovulation)" />
        <circle cx="97" cy="91" r="2" fill="#fff" opacity="0.7" />
      </g>
      <Spark x={52} y={84} s={0.8} delay={0.4} />
      <Spark x={150} y={70} s={0.9} delay={1.4} />
    </>
  );
}

function Ovulation() {
  const rays = Array.from({ length: 16 }, (_, i) => i * 22.5);
  return (
    <>
      <g className="art-pulse">
        <circle cx="100" cy="86" r="50" fill="var(--ovulation)" opacity="0.18" />
        {rays.map((a) => (
          <line
            key={a}
            x1="100"
            y1="28"
            x2="100"
            y2={a % 45 === 0 ? 20 : 24}
            stroke="var(--ovulation)"
            strokeWidth="2.2"
            strokeLinecap="round"
            transform={`rotate(${a} 100 86)`}
            opacity="0.7"
          />
        ))}
      </g>
      <g className="art-sway">
        <Stem d="M100 192 C 96 165 104 132 100 104" />
        <Leaf x={99} y={168} a={-55} l={36} w={11} />
        <Leaf x={101} y={146} a={54} l={32} w={10} tone={2} />
        <Flower x={100} y={86} n={10} l={36} w={10.5} fill="var(--ovulation)" />
        <Flower x={100} y={86} n={10} l={22} w={8} fill="var(--follicular)" start={18} />
        <circle cx="100" cy="86" r="8" fill="var(--period)" />
        <circle cx="97.5" cy="83.5" r="2.2" fill="#fff" opacity="0.6" />
      </g>
    </>
  );
}

function Luteal() {
  return (
    <>
      <g className="art-sway">
        <Stem d="M100 192 C 100 160 97 128 101 76" />
        <Stem d="M100 152 C 88 144 80 134 74 122" />
        <Stem d="M100 130 C 112 122 122 112 130 100" />
        <Stem d="M100 106 C 92 98 86 90 82 80" />
        <Leaf x={100} y={176} a={-50} l={28} w={9} />
        <Leaf x={100} y={170} a={48} l={24} w={8} tone={2} />
        <Pod x={71} y={110} r={16} delay={0} />
        <Pod x={134} y={88} r={18} delay={0.8} />
        <Pod x={80} y={66} r={14} delay={1.6} />
        <Pod x={104} y={60} r={15} delay={2.4} />
      </g>
      <path d="M150 42 a 13 13 0 1 0 12 18 a 10 10 0 1 1 -12 -18Z" fill="var(--luteal)" opacity="0.75" className="art-twinkle" />
      <Spark x={44} y={64} s={0.6} delay={1} color="var(--luteal)" />
    </>
  );
}

function Menstrual() {
  return (
    <>
      <g className="art-sway">
        <Stem d="M100 192 C 100 156 92 126 114 98" />
        <Leaf x={99} y={166} a={-52} l={34} w={11} />
        <Leaf x={100} y={146} a={46} l={28} w={9} tone={2} />
        <g transform="rotate(24 116 92)">
          <Flower x={116} y={92} n={4} l={34} w={12} fill="var(--period)" start={-75} spread={150} />
          <circle cx="116" cy="92" r="7" fill="var(--follicular)" />
        </g>
      </g>
      <Petal x={74} y={112} a={-130} l={18} w={7} fill="var(--period)" className="art-fall" />
      <Petal x={136} y={136} a={150} l={16} w={6} fill="var(--period)" opacity={0.85} className="art-fall art-fall-2" />
      <Petal x={88} y={146} a={-160} l={14} w={5.5} fill="var(--period)" opacity={0.7} className="art-fall art-fall-3" />
    </>
  );
}

function Late() {
  return (
    <>
      <g className="art-float">
        <circle cx="96" cy="84" r="40" fill="var(--period)" opacity="0.85" />
        <circle cx="114" cy="72" r="36" fill="var(--phase-soft)" />
      </g>
      <Spark x={140} y={60} s={1} delay={0} color="var(--ovulation)" />
      <Spark x={150} y={104} s={0.6} delay={1.2} color="var(--ovulation)" />
      <Spark x={56} y={50} s={0.7} delay={2.1} color="var(--ovulation)" />
      <g className="art-sway">
        <Stem d="M100 192 C 99 172 102 158 100 146" />
        <Leaf x={100} y={176} a={-55} l={26} w={9} />
        <Leaf x={100} y={166} a={52} l={22} w={8} tone={2} />
        <Pod x={100} y={136} r={11} />
      </g>
    </>
  );
}

const ART = {
  menstrual: Menstrual,
  follicular: Follicular,
  fertile: Fertile,
  ovulation: Ovulation,
  luteal: Luteal,
  late: Late,
};

export default function PhaseArt({ phase = 'luteal', size = 200, className = '', still = false }) {
  const Art = ART[phase] || Luteal;
  const clip = 'art-clip-' + useId().replace(/:/g, '');
  return (
    <svg
      className={`art ${still ? 'art-still' : ''} ${className}`}
      data-phase={phase}
      viewBox="0 0 200 200"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clip}>
          <circle cx="100" cy="98" r="84" />
        </clipPath>
      </defs>
      <Backdrop />
      <g clipPath={`url(#${clip})`}>
        <Art />
      </g>
    </svg>
  );
}
