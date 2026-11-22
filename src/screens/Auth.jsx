import { useState } from 'react';
import { Eye, EyeOff, MailCheck } from 'lucide-react';
import PhaseArt from '../components/PhaseArt.jsx';
import { LANGS } from '../lib/i18n.js';
import { setState } from '../lib/store.js';
import * as sync from '../lib/sync.js';

// First screen for anyone without an account: her, or a friend she invited.
// welcome → create account / sign in → (check inbox, if email confirmation is on)
export default function Auth({ t, lang }) {
  const [view, setView] = useState('welcome');
  const [dir, setDir] = useState('next');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  function go(v, d = 'next') {
    setDir(d);
    setError(null);
    setNotice(null);
    setView(v);
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (view === 'signup') {
        setState((s) => ({ ...s, profile: { ...s.profile, name: name.trim() } }), { local: true });
        const res = await sync.signUp(email.trim(), password, name.trim());
        if (!res.session) go('check');
      } else {
        await sync.signIn(email.trim(), password);
      }
    } catch (err) {
      const key = sync.authErrorKey(err);
      setError(key ? t(key) : t('err.generic', { msg: err.message }));
    } finally {
      setBusy(false);
    }
  }

  async function forgot() {
    if (!email.trim()) return setError(t('auth.email') + '?');
    setBusy(true);
    try {
      await sync.sendReset(email.trim());
      setNotice(t('auth.resetSent', { email: email.trim() }));
    } catch (err) {
      const key = sync.authErrorKey(err);
      setError(key ? t(key) : t('err.generic', { msg: err.message }));
    } finally {
      setBusy(false);
    }
  }

  const slide = dir === 'next' ? 'slide-next' : 'slide-prev';

  if (view === 'welcome') {
    return (
      <div className="auth onboard stagger" data-phase="luteal" key="welcome">
        <PhaseArt phase="luteal" size={230} />
        <p className="brand" style={{ textAlign: 'center' }}>
          {t('appName')}
        </p>
        <p className="muted" style={{ fontSize: 19, textAlign: 'center', margin: '0 auto', maxWidth: '24ch' }}>
          {t('ob.tagline')}
        </p>
        <div className="lang-pick" role="group" aria-label={t('ob.language')} style={{ justifyContent: 'center' }}>
          {LANGS.map((l) => (
            <button
              key={l.id}
              className="chip"
              aria-pressed={lang === l.id}
              onClick={() => setState((s) => ({ ...s, profile: { ...s.profile, lang: l.id } }), { local: true })}
            >
              {l.label}
            </button>
          ))}
        </div>
        <div className="grow" />
        <div className="stack">
          <button className="btn btn-primary" style={{ '--phase': 'var(--period)' }} onClick={() => go('signup')}>
            {t('auth.create')}
          </button>
          <button className="btn btn-line" onClick={() => go('signin')}>
            {t('auth.have')}
          </button>
        </div>
      </div>
    );
  }

  if (view === 'check') {
    return (
      <div className={`auth onboard ${slide}`} data-phase="fertile" key="check">
        <PhaseArt phase="fertile" size={200} />
        <h1>
          <MailCheck size={26} style={{ verticalAlign: -3, marginRight: 8 }} />
          {t('auth.checkTitle')}
        </h1>
        <p className="muted">{t('auth.checkBody', { email })}</p>
        <div className="grow" />
        <div className="stack">
          <button className="btn btn-primary" onClick={() => go('signin')}>
            {t('auth.confirmed')}
          </button>
        </div>
      </div>
    );
  }

  const up = view === 'signup';
  return (
    <div className={`auth onboard ${slide}`} data-phase="menstrual" key={view}>
      <button className="btn btn-ghost" style={{ alignSelf: 'flex-start', marginLeft: -12 }} onClick={() => go('welcome', 'prev')}>
        ← {t('auth.back')}
      </button>
      <h1 style={{ marginTop: 12 }}>{up ? t('auth.titleUp') : t('auth.titleIn')}</h1>
      <p className="muted" style={{ margin: 0 }}>
        {up ? t('auth.subUp') : t('auth.subIn')}
      </p>

      <form onSubmit={submit}>
        {up && (
          <label className="field">
            <span>{t('auth.name')}</span>
            <input autoComplete="given-name" required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        )}
        <label className="field">
          <span>{t('auth.email')}</span>
          <input type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>
            {t('auth.password')} {up && <span className="tiny">· {t('auth.passwordHint')}</span>}
          </span>
          <span className="pw-wrap">
            <input
              type={show ? 'text' : 'password'}
              autoComplete={up ? 'new-password' : 'current-password'}
              minLength={up ? 8 : undefined}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="button" className="pw-toggle" onClick={() => setShow(!show)} aria-label={show ? t('auth.hide') : t('auth.show')}>
              {show ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </span>
        </label>

        {error && <p className="form-error" role="alert">{error}</p>}
        {notice && <p className="small muted" role="status">{notice}</p>}

        <button className="btn btn-primary" disabled={busy}>
          {up ? t('auth.submitUp') : t('auth.submitIn')}
        </button>
        {!up && (
          <button type="button" className="btn btn-ghost" onClick={forgot} disabled={busy}>
            {t('auth.forgot')}
          </button>
        )}
      </form>

      <div className="grow" />
      <button className="btn btn-ghost" onClick={() => go(up ? 'signin' : 'signup')}>
        {up ? t('auth.switchIn') : t('auth.switchUp')}
      </button>
    </div>
  );
}

export function NewPassword({ t }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="app">
      <div className="auth onboard slide-next" data-phase="luteal">
        <PhaseArt phase="luteal" size={180} />
        <h1>{t('auth.newPassTitle')}</h1>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await sync.setNewPassword(password);
            } catch (err) {
              const key = sync.authErrorKey(err);
              setError(key ? t(key) : t('err.generic', { msg: err.message }));
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="field">
            <span>
              {t('auth.password')} <span className="tiny">· {t('auth.passwordHint')}</span>
            </span>
            <input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="btn btn-primary" disabled={busy}>
            {t('auth.newPassSave')}
          </button>
        </form>
      </div>
    </div>
  );
}
