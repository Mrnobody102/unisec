import { useState } from 'react';
export type DemoRole = 'resident' | 'manager';
export type DemoIdentity = {
  id: string;
  role: DemoRole;
  name: string;
  communityId: string | null;
};
export const demoSessionKey = 'dear.demo-session.v1';
export function validIdentity(raw: unknown): raw is DemoIdentity {
  const x = raw as DemoIdentity;
  return (
    !!x &&
    ['resident', 'manager'].includes(x.role) &&
    typeof x.id === 'string' &&
    x.id.length <= 256 &&
    !!x.id &&
    typeof x.name === 'string' &&
    !!x.name.trim() &&
    x.name.length <= 160 &&
    (x.communityId === null || typeof x.communityId === 'string')
  );
}
export const managerName = 'Điều phối viên';
export function useDemoSession() {
  const [identity, setIdentity] = useState<DemoIdentity | null>(() => {
    const role = new URLSearchParams(location.search).get('demoRole');
    if (role === 'manager')
      return {
        id: 'demo:manager:điều phối viên',
        role,
        name: managerName,
        communityId: null
      };
    try {
      const raw = JSON.parse(localStorage.getItem(demoSessionKey) ?? 'null');
      // Older sessions stored the manager under a previous display name.
      return validIdentity(raw) ? (raw.role === 'manager' ? { ...raw, name: managerName } : raw) : null;
    } catch {
      return null;
    }
  });
  const signIn = (role: DemoRole, name: string, communityId: string | null) => {
    const displayName = role === 'manager' ? managerName : name.trim();
    if (!displayName) return;
    const value: DemoIdentity = {
      id: role === 'manager' ? 'demo:manager:điều phối viên' : `demo:resident:${crypto.randomUUID()}`,
      role,
      name: displayName,
      communityId
    };
    if (!validIdentity(value)) return;
    try {
      localStorage.setItem(demoSessionKey, JSON.stringify(value));
    } catch {
      /* Session still works in memory. */
    }
    setIdentity(value);
  };
  const signOut = () => {
    const url = new URL(location.href);
    url.searchParams.delete('demoRole');
    history.replaceState(null, '', url);
    try {
      localStorage.removeItem(demoSessionKey);
    } catch {
      /* Demo sign-out is local only. */
    }
    setIdentity(null);
  };
  return { identity, signIn, signOut };
}
