const SESSION_INVALID_MESSAGES = [
  'Your account was signed in from another device.',
  'Session expired. Please sign in again.',
];

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 401) {
    const body = (await res.clone().json().catch(() => ({}))) as Record<string, unknown>;
    if (SESSION_INVALID_MESSAGES.includes(String(body.error || ''))) {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch {
        // ignore
      }
      // Full teardown of the dead session: hard redirect so all state is cleared.
      window.location.replace('/login');
    }
  }
  return res;
}