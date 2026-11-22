import { useRef, useState, useSyncExternalStore } from 'react';
import { Copy, Share2, LogOut, Download, Upload, Trash2, CalendarPlus } from 'lucide-react';
import { LANGS, relTime } from '../lib/i18n.js';
import { setState, exportData, importData, resetAll } from '../lib/store.js';
import { buildIcs, downloadFile } from '../lib/ics.js';
import { hashPin } from '../lib/pin.js';
import { todayISO } from '../lib/dates.js';
import { toast } from '../components/toast.jsx';
import PinPad from '../components/PinPad.jsx';
import Sheet from '../components/Sheet.jsx';
import * as sync from '../lib/sync.js';

export default function Me({ t, state, analysis }) {
  const p = state.profile;
  const fileRef = useRef(null);
  const [pinFlow, setPinFlow] = useState(null);

  const setProfile = (patch, local = false) => setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }), { local });

  function onImport(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    f.text().then((txt) => {
      try {
        importData(txt);
        toast(t('me.imported'));
      } catch {
        toast(t('me.importError'));
      }
    });
    e.target.value = '';
  }

  async function onPinDone(pin) {
    if (pinFlow.step === 1) return setPinFlow({ step: 2, first: pin });
    if (pin !== pinFlow.first) {
      toast(t('me.pinMismatch'));
      return setPinFlow({ step: 1 });
    }
    const hash = await hashPin(pin);
    setState((s) => ({ ...s, pinHash: hash }), { local: true });
    setPinFlow(null);
    toast(t('me.pinSaved'));
  }

  return (
    <div>
      <h1 className="screen-title">{t('me.title')}</h1>

      <Group title={t('me.profile')}>
        <label className="row">
          <span>{t('me.name')}</span>
          <input value={p.name} onChange={(e) => setProfile({ name: e.target.value })} maxLength={40} />
        </label>
        <label className="row">
          <span>{t('me.cycleLen')}</span>
          <span>
            <input type="number" min="18" max="50" value={p.cycleLen} onChange={(e) => setProfile({ cycleLen: Number(e.target.value) || 28 })} />{' '}
            <span className="val">{t('ob.days')}</span>
          </span>
        </label>
        <label className="row">
          <span>{t('me.periodLen')}</span>
          <span>
            <input type="number" min="1" max="12" value={p.periodLen} onChange={(e) => setProfile({ periodLen: Number(e.target.value) || 5 })} />{' '}
            <span className="val">{t('ob.days')}</span>
          </span>
        </label>
      </Group>
      <p className="tiny" style={{ margin: '-20px 4px 30px' }}>
        {t('me.lengthsHint')}
      </p>

      <Group title={t('me.language')}>
        <div className="row">
          <span>{t('me.language')}</span>
          <div className="seg-control">
            {LANGS.map((l) => (
              <button key={l.id} aria-pressed={p.lang === l.id} onClick={() => setProfile({ lang: l.id })}>
                {l.label}
              </button>
            ))}
          </div>
        </div>
        <div className="row">
          <span>{t('me.theme')}</span>
          <div className="seg-control">
            {['system', 'light', 'dark'].map((m) => (
              <button key={m} aria-pressed={p.theme === m} onClick={() => setProfile({ theme: m }, true)}>
                {t('me.theme.' + m)}
              </button>
            ))}
          </div>
        </div>
      </Group>

      <SharePanel t={t} state={state} />

      <Group title={t('me.privacy')}>
        <div className="row">
          <span>{t('me.pin')}</span>
          {state.pinHash ? (
            <button
              className="btn btn-ghost"
              onClick={() => {
                setState((s) => ({ ...s, pinHash: null }), { local: true });
                toast(t('me.pinRemoved'));
              }}
            >
              {t('me.pinRemove')}
            </button>
          ) : (
            <button className="btn btn-ghost" onClick={() => setPinFlow({ step: 1 })}>
              {t('me.pinSet')}
            </button>
          )}
        </div>
      </Group>

      <Group title={t('me.calendar')}>
        <button
          className="row"
          disabled={!analysis.hasData}
          onClick={() => downloadFile('lunaria.ics', buildIcs(analysis, t), 'text/calendar')}
        >
          <span>{t('me.ics')}</span>
          <CalendarPlus size={18} />
        </button>
      </Group>
      <p className="tiny" style={{ margin: '-20px 4px 30px' }}>
        {t('me.icsHint')}
      </p>

      <Group title={t('me.backup')}>
        <button className="row" onClick={() => downloadFile(`lunaria-${todayISO()}.json`, exportData(), 'application/json')}>
          <span>{t('me.export')}</span>
          <Download size={18} />
        </button>
        <button className="row" onClick={() => fileRef.current.click()}>
          <span>{t('me.import')}</span>
          <Upload size={18} />
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImport} />
      </Group>

      <button
        className="btn btn-danger btn-block"
        onClick={() => {
          if (window.confirm(t('me.deleteConfirm'))) resetAll();
        }}
      >
        <Trash2 size={17} />
        {t('me.delete')}
      </button>

      <p className="tiny" style={{ marginTop: 24 }}>
        {t('me.about')}
      </p>

      {pinFlow && (
        <Sheet title={pinFlow.step === 1 ? t('me.pinNew') : t('me.pinConfirm')} onClose={() => setPinFlow(null)} closeLabel={t('log.close')}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 20px' }}>
            <PinPad key={pinFlow.step} onComplete={onPinDone} />
          </div>
        </Sheet>
      )}
    </div>
  );
}

function Group({ title, children }) {
  return (
    <section className="group">
      <h2>{title}</h2>
      <div className="rows">{children}</div>
    </section>
  );
}

function useSync() {
  return useSyncExternalStore(sync.subscribeSync, sync.getSyncStatus);
}

function SharePanel({ t, state }) {
  const status = useSync();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  if (!sync.syncAvailable) {
    return (
      <section className="group">
        <h2>{t('share.title')}</h2>
        <div className="share-box">
          <p className="small muted" style={{ margin: 0 }}>
            {t('share.intro')}
          </p>
          <p className="small" style={{ margin: 0 }}>
            {t('share.unavailable')}
          </p>
        </div>
      </section>
    );
  }

  async function run(fn) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg(t('share.errorGeneric', { msg: e.message }));
    } finally {
      setBusy(false);
    }
  }

  const user = status.user;
  const token = state.share.token;
  const link = token ? sync.shareUrl(token) : null;

  const setShare = (patch) => setState((s) => ({ ...s, share: { ...s.share, ...patch } }));

  return (
    <section className="group">
      <h2>{t('share.title')}</h2>
      <div className="share-box">
        <p className="small muted" style={{ margin: 0 }}>
          {t('share.intro')}
        </p>

        {!user && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                if (mode === 'signup') {
                  const res = await sync.signUp(email, password);
                  if (!res.session) setMsg(t('share.confirmEmail'));
                } else await sync.signIn(email, password);
              });
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <label className="field">
              <span>{t('share.email')}</span>
              <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="field">
              <span>{t('share.password')}</span>
              <input
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button className="btn btn-primary" disabled={busy}>
              {mode === 'signup' ? t('share.signUp') : t('share.signIn')}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}>
              {mode === 'signup' ? t('share.haveAccount') : t('share.newAccount')}
            </button>
          </form>
        )}

        {user && (
          <>
            <div className="small">
              {t('share.signedIn', { email: user.email })}
              <br />
              <span className="tiny">
                {status.state === 'syncing'
                  ? t('share.syncing')
                  : status.state === 'error'
                    ? t('share.syncError')
                    : status.at
                      ? t('share.synced', { time: relTime(status.at, state.profile.lang) })
                      : ''}
              </span>
            </div>

            {!token ? (
              <button className="btn btn-primary" disabled={busy} onClick={() => run(sync.createShare)}>
                <Share2 size={17} />
                {t('share.create')}
              </button>
            ) : (
              <>
                <div className="field">
                  <span>{t('share.link')}</span>
                  <div className="link-box">{link}</div>
                </div>
                <div className="btn-row">
                  <button
                    className="btn btn-line"
                    onClick={() => navigator.clipboard.writeText(link).then(() => toast(t('share.copied')))}
                  >
                    <Copy size={16} />
                    {t('share.copy')}
                  </button>
                  {navigator.share && (
                    <button className="btn btn-primary" onClick={() => navigator.share({ title: 'Lunaria', url: link }).catch(() => {})}>
                      <Share2 size={16} />
                      {t('share.send')}
                    </button>
                  )}
                </div>

                <div className="field">
                  <span>{t('share.what')}</span>
                </div>
                <div className="rows" style={{ background: 'var(--bg)' }}>
                  <div className="row small">
                    <span>{t('share.always')}</span>
                    <span className="switch" role="switch" aria-checked="true" aria-disabled="true" style={{ opacity: 0.6 }} />
                  </div>
                  <Toggle label={t('share.mood')} on={state.share.mood} onChange={(v) => setShare({ mood: v })} />
                  <Toggle label={t('share.symptoms')} on={state.share.symptoms} onChange={(v) => setShare({ symptoms: v })} />
                </div>

                <button
                  className="btn btn-danger"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(t('share.stopConfirm'))) run(async () => {
                      await sync.revokeShare();
                      toast(t('share.stopped'));
                    });
                  }}
                >
                  {t('share.stop')}
                </button>
              </>
            )}

            <button className="btn btn-ghost" onClick={() => run(sync.signOut)}>
              <LogOut size={16} />
              {t('share.signOut')}
            </button>
          </>
        )}

        {msg && <p className="form-error">{msg}</p>}
      </div>
    </section>
  );
}

function Toggle({ label, on, onChange }) {
  return (
    <button className="row small" role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span>{label}</span>
      <span className="switch" aria-checked={on} />
    </button>
  );
}
