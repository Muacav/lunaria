// PIN lock. Only a hash of the PIN is stored, on this phone only. It is a
// privacy screen against someone picking up the phone, not encryption.

export async function hashPin(pin) {
  const data = new TextEncoder().encode('lunaria-pin:' + pin);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
