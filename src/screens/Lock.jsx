import { useState } from 'react';
import { Lock as LockIcon } from 'lucide-react';
import PinPad from '../components/PinPad.jsx';
import { hashPin } from '../lib/pin.js';
import { getState, resetAll } from '../lib/store.js';

export default function Lock({ t, onUnlock }) {
  const [errors, setErrors] = useState(0);
  return (
    <div className="lock" data-phase="menstrual">
      <LockIcon size={26} />
      <h1>{t('lock.title')}</h1>
      <p className="small muted" style={{ minHeight: 21, margin: 0 }} aria-live="polite">
        {errors ? t('lock.wrong') : ''}
      </p>
      <PinPad
        error={errors}
        onComplete={async (pin) => {
          if ((await hashPin(pin)) === getState().pinHash) onUnlock();
          else setErrors((e) => e + 1);
        }}
      />
      {errors >= 3 && (
        <button
          className="btn btn-ghost small"
          onClick={() => {
            if (window.confirm(t('me.deleteConfirm'))) {
              resetAll();
              onUnlock();
            }
          }}
        >
          {t('lock.forgot')}
        </button>
      )}
    </div>
  );
}
