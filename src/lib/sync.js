// Optional cloud sync with Supabase (free tier). Turned on when
// VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set at build time.
// Without them the app is fully local.
//
// Tables (see supabase/schema.sql):
//   cycle_data      her full data, readable only by her (row level security)
//   partner_shares  the curated snapshot behind a partner link
// The partner reads through get_partner_view(token), so no account is needed
// on his side and he can never list or read anything else.

import { createClient } from '@supabase/supabase-js';
import { getState, setState, subscribe } from './store.js';
import { buildSnapshot } from './snapshot.js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const syncAvailable = Boolean(URL && KEY);
export const supabase = syncAvailable
  ? createClient(URL, KEY, { auth: { persistSession: true, storageKey: 'lunaria:auth' } })
  : null;

// ---- tiny status store for the UI --------------------------------------
let status = { state: 'idle', at: null, error: null, user: null };
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

// ---- auth ----------------------------------------------------------------
export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: window.location.origin + window.location.pathname },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut() {
  await supabase.auth.signOut();
}

// ---- data sync -----------------------------------------------------------
function cloudPayload(s) {
  const { pinHash, ...rest } = s;
  return rest;
}

async function pull(userId) {
  const { data, error } = await supabase.from('cycle_data').select('data, updated_at').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

async function push(userId) {
  const s = getState();
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

// On sign-in: keep whichever copy is newer, then upload.
async function reconcile(userId) {
  try {
    setStatus({ state: 'syncing' });
    const remote = await pull(userId);
    const local = getState();
    const remoteAt = remote?.data?.updatedAt || 0;
    const localHasData = local.periodDays.length > 0 || Object.keys(local.logs).length > 0;
    if (remote && (remoteAt > local.updatedAt || !localHasData)) {
      setState((s) => ({ ...s, ...remote.data, pinHash: s.pinHash, onboarded: true }), { local: true, fromCloud: true });
      setStatus({ state: 'ok', at: Date.now(), error: null });
      if (getState().share.token) await pushSnapshot(userId);
    } else {
      await push(userId);
    }
  } catch (e) {
    setStatus({ state: 'error', error: e.message });
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
    setStatus({ user });
    if (user) reconcile(user.id);
  });
  supabase.auth.onAuthStateChange((event, session) => {
    const user = session?.user || null;
    const changed = user?.id !== status.user?.id;
    setStatus({ user });
    if (user && changed) reconcile(user.id);
  });
  subscribe((_s, meta) => {
    if (!meta.local) schedulePush();
  });
  // Retry an upload that failed while offline.
  window.addEventListener('online', schedulePush);
}

// ---- partner link --------------------------------------------------------
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
  return `${window.location.origin}${window.location.pathname}#/p/${token}`;
}

export async function fetchPartnerView(token) {
  const { data, error } = await supabase.rpc('get_partner_view', { p_token: token });
  if (error) throw error;
  return data; // { snapshot, updated_at } or null
}
