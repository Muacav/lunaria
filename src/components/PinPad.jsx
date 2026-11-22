import { useEffect, useState } from 'react';
import { Delete } from 'lucide-react';

// Four-digit keypad. Calls onComplete with the PIN; the parent decides if
// it is right. `error` makes the dots shake and clears them.
export default function PinPad({ onComplete, error }) {
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (!error) return;
    setShake(true);
    setPin('');
    const id = setTimeout(() => setShake(false), 400);
    return () => clearTimeout(id);
  }, [error]);

  function press(d) {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) setTimeout(() => {
      onComplete(next);
      setPin('');
    }, 120);
  }

  useEffect(() => {
    const onKey = (e) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') setPin((p) => p.slice(0, -1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
      <div className={`pin-dots ${shake ? 'shake' : ''}`} aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <i key={i} data-on={i < pin.length} />
        ))}
      </div>
      <div className="keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} onClick={() => press(d)}>
            {d}
          </button>
        ))}
        <span />
        <button onClick={() => press('0')}>0</button>
        <button onClick={() => setPin((p) => p.slice(0, -1))} aria-label="Delete" style={{ background: 'transparent' }}>
          <Delete size={24} />
        </button>
      </div>
    </div>
  );
}
