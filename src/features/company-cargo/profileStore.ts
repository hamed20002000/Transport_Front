import { useEffect, useSyncExternalStore } from 'react';
import { getUserProfile, type UserProfile } from './api';

// One copy of the logged-in user's profile shared by the header, the home greeting and the profile page,
// so a save on the profile page shows up everywhere at once. Tied to the token so another login refetches.
let state: { token: string | null; profile: UserProfile | null } = { token: null, profile: null };
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

const token = () => localStorage.getItem('authToken');

function emit(profile: UserProfile | null) {
  state = { token: token(), profile };
  listeners.forEach((listener) => listener());
}

export function setCachedProfile(profile: UserProfile) {
  emit(profile);
}

function load() {
  if (inflight || (state.profile && state.token === token())) return;
  inflight = getUserProfile()
    .then(emit)
    .catch(() => undefined) // Callers fall back to the username.
    .finally(() => {
      inflight = null;
    });
}

export function useProfile() {
  const profile = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => (state.token === token() ? state.profile : null),
  );
  useEffect(load, []);
  return profile;
}

// Company name for a company profile, full name for a person; empty when neither is filled in.
export function displayName(profile: UserProfile | null) {
  if (!profile) return '';
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
  return (profile.profileType === 0 ? fullName || profile.companyName : profile.companyName || fullName) || '';
}
