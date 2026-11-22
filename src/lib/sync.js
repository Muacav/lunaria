// Accounts and cloud sync with Supabase (free tier). Turned on when
// VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set at build time; then an
// account is required and every user (her, her friends) has their own data.
// Without them the app runs fully local, which is handy for development.
//
// Tables (see supabase/schema.sql):
//   cycle_data      each user's full data, readable only by that user (RLS)
//   partner_shares  the curated snapshot behind a partner link
// The partner reads through get_partner_view(token), so he needs no account
// and can never list or read anything else.

import { createClient } from '@supabase/supabase-js';
import { getState, setState, subscribe, resetAll } from './store.js';
import { buildSnapshot } from './snapshot.js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const syncAvailable = Boolean(URL && KEY);
export const supabase = syncAvailable
  ? createClient(URL, KEY, { auth: { persistSession: true, storageKey: 'lunaria:auth', detectSessionInUrl: true } })
  : null;

// ---- status store for the UI ---------------------------------------------
// ready:      the saved session has been checked
// reconciled: her cloud data has been loaded after sign-in
// recovery:   she opened a password-reset link and must choose a new one
let status = { state: 'idle', at: null, error: null, user: null, ready: !syncAvailable, reconciled: false, recovery: false };
const statusListeners = new Set();
function setStatus(patch) {
  status = { ...status, ...patch };
  statusListeners.forEach((l) => l(status));
}
export function getSyncStatus() {
  return status;
}
export function subscribeSync(fn) {
  statusListeners.add(fn);
  return () => statusListeners.delete(fn);
}

// ---- auth ------------------------------------------------------------------
const redirect = () => window.location.origin + window.location.pathname;

export async function signUp(email, password, name) {
  const lang = getState().profile.lang;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirect(), data: { name, lang } },
  });
  if (error) throw error;
  // Supabase answers a sign-up for an existing confirmed email with a user
  // that has no identities, instead of an error.
  if (data.user && data.user.identities?.length === 0) {
    const e = new Error('User already registered');
    e.code = 'user_already_exists';
    throw e;
  }
  return data;
}

export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function sendReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirect() });
  if (error) throw error;
}

export async function setNewPassword(password) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
  setStatus({ recovery: false });
}

// Account emails (password reset…) are written in the language stored on
// the account, so keep it in step with the app's language.
export async function saveAccountLang(lang) {
  const user = status.user;
  if (!user || user.user_metadata?.lang === lang) return;
  const { data, error } = await supabase.auth.updateUser({ data: { lang } });
  if (!error && data?.user) setStatus({ user: data.user });
}

export async function signOut() {
  await supabase.auth.signOut();
  resetAll();
}

export async function deleteAccount() {
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw error;
  await supabase.auth.signOut();
  resetAll();
}

// Turns Supabase errors into a key from i18n.js.
export function authErrorKey(e) {
  const code = e?.code || '';
  const msg = (e?.message || '').toLowerCase();
  if (code === 'invalid_credentials' || msg.includes('invalid login')) return 'err.invalid';
  if (code === 'user_already_exists' || msg.includes('already registered')) return 'err.exists';
  if (code === 'email_not_confirmed' || msg.includes('not confirmed')) return 'err.unconfirmed';
  if (code === 'weak_password' || msg.includes('password should')) return 'err.weak';
  if (code.startsWith('over_') || msg.includes('rate limit')) return 'err.rate';
  if (code === 'email_address_not_authorized' || msg.includes('not authorized')) return 'err.emailBlocked';
  if (msg.includes('fetch') || msg.includes('network')) return 'err.network';
  return null;
}

// ---- data sync ---------------------------------------------------------------
function cloudPayload(s) {
  const { pinHash, lastWelcome, ...rest } = s;
  return rest;
}

async function pull(userId) {
  const { data, error } = await supabase.from('cycle_data').select('data, updated_at').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

async function push(userId) {
  const s = getState();
  if (s.ownerId !== userId) return;
  setStatus({ state: 'syncing' });
  const { error } = await supabase
    .from('cycle_data')
    .upsert({ user_id: userId, data: cloudPayload(s), updated_at: new Date(s.updatedAt || Date.now()).toISOString() });
  if (error) throw error;
  if (s.share.token) await pushSnapshot(userId);
  setStatus({ state: 'ok', at: Date.now(), error: null });
}

export async function pushSnapshot(userId = status.user?.id) {
  const s = getState();
  if (!userId || !s.share.token) return;
  const { error } = await supabase
    .from('partner_shares')
    .upsert({ token: s.share.token, owner: userId, snapshot: buildSnapshot(s), updated_at: new Date().toISOString() });
  if (error) throw error;
}

// After sign-in: make sure this phone holds this user's data. Another
// person's leftovers are cleared first, then the newer copy wins.
async function reconcile(user) {
  const userId = user.id;
  try {
    setStatus({ state: 'syncing', reconciled: false });
    let local = getState();
    if (local.ownerId && local.ownerId !== userId) {
      resetAll();
      local = getState();
    }
    const remote = await pull(userId);
    const localHasData = local.onboarded && (local.periodDays.length > 0 || Object.keys(local.logs).length > 0);
    if (remote && (!localHasData || (remote.data?.updatedAt || 0) >= local.updatedAt)) {
      setState(
        (s) => ({ ...s, ...remote.data, profile: { ...s.profile, ...remote.data.profile }, ownerId: userId, pinHash: s.pinHash, lastWelcome: s.lastWelcome }),
        { local: true, fromCloud: true }
      );
      setStatus({ state: 'ok', at: Date.now(), error: null });
      if (getState().share.token) await pushSnapshot(userId);
    } else {
      const metaName = user.user_metadata?.name;
      setState(
        (s) => ({ ...s, ownerId: userId, profile: { ...s.profile, name: s.profile.name || metaName || '' } }),
        { local: true }
      );
      if (getState().onboarded) await push(userId);
      else setStatus({ state: 'ok', error: null });
    }
  } catch (e) {
    setStatus({ state: 'error', error: e.message });
  } finally {
    setStatus({ reconciled: true });
  }
}

let timer = null;
function schedulePush() {
  const userId = status.user?.id;
  if (!userId) return;
  clearTimeout(timer);
  timer = setTimeout(() => push(userId).catch((e) => setStatus({ state: 'error', error: e.message })), 1200);
}

export function startSync() {
  if (!supabase) return;
  supabase.auth.getSession().then(({ data }) => {
    const user = data.session?.user || null;
    setStatus({ user, ready: true, reconciled: !user });
    if (user) reconcile(user);
  });
  supabase.auth.onAuthStateChange((event, session) => {
    const user = session?.user || null;
    if (event === 'PASSWORD_RECOVERY') setStatus({ recovery: true });
    const changed = user?.id !== status.user?.id;
    if (!changed) return setStatus({ user });
    setStatus({ user, ready: true, reconciled: !user });
    // Supabase advises not to await other calls inside this callback.
    if (user) setTimeout(() => reconcile(user), 0);
  });
  subscribe((_s, meta) => {
    if (!meta.local) schedulePush();
  });
  // Retry an upload that failed while offline.
  window.addEventListener('online', schedulePush);
}

// ---- partner link --------------------------------------------------------------
function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function createShare() {
  const userId = status.user?.id;
  if (!userId) throw new Error('not signed in');
  // One link at a time: drop any older one first.
  await supabase.from('partner_shares').delete().eq('owner', userId);
  const token = randomToken();
  setState((s) => ({ ...s, share: { ...s.share, token } }));
  await pushSnapshot(userId);
  return token;
}

export async function revokeShare() {
  const userId = status.user?.id;
  if (userId) {
    const { error } = await supabase.from('partner_shares').delete().eq('owner', userId);
    if (error) throw error;
  }
  setState((s) => ({ ...s, share: { ...s.share, token: null } }));
}

export function shareUrl(token) {
  return `${redirect()}#/p/${token}`;
}

export function appUrl() {
  return redirect();
}

export async function fetchPartnerView(token) {
  const { data, error } = await supabase.rpc('get_partner_view', { p_token: token });
  if (error) throw error;
  return data; // { snapshot, updated_at } or null
}
