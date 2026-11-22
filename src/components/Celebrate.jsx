import { useEffect, useState } from 'react';

// The "saved" moment: a check blooms in the centre while petals in the
// phase colours scatter outwards, then everything fades away by itself.

let fire = () => {};

export function celebrate(message) {
  fire(message);
}

const COLOURS = ['var(--period)', 'var(--follicular)', 'var(--fertile)', 'var(--ovulation)', 'var(--luteal)'];

export function Celebration() {
  const [shot, setShot] = useState(null);

  useEffect(() => {
    let id;
    fire = (message) => {
      clearTimeout(id);
      setShot({ message, key: Date.now() });
      id = setTimeout(() => setShot(null), 1700);
    };
    return () => clearTimeout(id);
  }, []);

  if (!shot) return null;
  return (
    <div className="celebrate" key={shot.key} role="status" aria-live="polite">
      <div className="celebrate-inner">
        <div className="burst">
          {Array.from({ length: 14 }, (_, i) => (
            <span
              key={i}
              className="burst-petal"
              style={{ '--a': `${i * (360 / 14)}deg`, '--c': COLOURS[i % COLOURS.length], animationDelay: `${0.1 + (i % 3) * 0.04}s` }}
            />
          ))}
          <svg className="check-disc" viewBox="0 0 96 96" aria-hidden="true">
            <circle cx="48" cy="48" r="44" />
            <path d="M30 49 L43 61 L67 36" />
          </svg>
        </div>
        <p>{shot.message}</p>
      </div>
    </div>
  );
}
