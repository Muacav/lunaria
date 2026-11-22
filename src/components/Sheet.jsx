import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// Bottom sheet used for logging and day details. Closes on Escape or a tap
// on the dimmed background.
export default function Sheet({ title, sub, onClose, children, footer, closeLabel = 'Close', phase }) {
  const ref = useRef(null);

  useEffect(() => {
    const prev = document.activeElement;
    ref.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [onClose]);

  return createPortal(
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} ref={ref} tabIndex={-1} data-phase={phase}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <div>
            <h2>{title}</h2>
            {sub && <div className="sub">{sub}</div>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label={closeLabel}>
            <X size={20} />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </>,
    document.body
  );
}
