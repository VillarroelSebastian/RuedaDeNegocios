const listeners = new Set<() => void>();
export function refreshNotifications() { listeners.forEach(fn => fn()); }
export function subscribeNotifications(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
