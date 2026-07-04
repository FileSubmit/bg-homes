import { supabase, isSupabaseConfigured } from './supabase.js';

const listeners = new Set();

const state = {
  loading: true,
  configured: isSupabaseConfigured,
  user: null,
  profile: null,
  isAdmin: false,
  recoveryMode: false,
  error: null,
};

let authSubscription = null;
let initPromise = null;

function cloneState() {
  return {
    ...state,
    user: state.user ? { ...state.user } : null,
    profile: state.profile ? { ...state.profile } : null,
  };
}

function notify() {
  const snapshot = cloneState();

  listeners.forEach((listener) => {
    listener(snapshot);
  });
}

function setState(partialState) {
  Object.assign(state, partialState);
  notify();
}

function getDisplayName(user, profile) {
  const firstName = profile?.first_name?.trim();
  const lastName = profile?.last_name?.trim();
  const userName = user?.user_metadata?.full_name?.trim();

  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }

  if (firstName) {
    return firstName;
  }

  if (userName) {
    return userName;
  }

  return user?.email?.split('@')[0] ?? 'User';
}

function splitName(fullName) {
  const trimmed = fullName.trim().replace(/\s+/g, ' ');

  if (!trimmed) {
    return {
      firstName: 'User',
      lastName: 'Member',
    };
  }

  const [firstName, ...rest] = trimmed.split(' ');

  return {
    firstName: firstName || 'User',
    lastName: rest.length > 0 ? rest.join(' ') : 'Member',
  };
}

async function loadProfile(userId) {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, phone, role, created_at, updated_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data;
}

async function refreshAuthState() {
  if (!supabase) {
    setState({
      loading: false,
      configured: false,
      user: null,
      profile: null,
      isAdmin: false,
      error: 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable auth.',
    });

    return cloneState();
  }

  setState({ loading: true, error: null });

  const { data, error } = await supabase.auth.getUser();
  const user = error ? null : data.user;
  const profile = user ? await loadProfile(user.id) : null;

  setState({
    loading: false,
    user,
    profile,
    isAdmin: profile?.role === 'admin',
    error: error ? error.message : null,
  });

  return cloneState();
}

function ensureSubscription() {
  if (!supabase || authSubscription) {
    return;
  }

  authSubscription = supabase.auth.onAuthStateChange(async (event) => {
    if (event === 'PASSWORD_RECOVERY') {
      setState({ recoveryMode: true });
    }

    if (event === 'SIGNED_OUT') {
      setState({ recoveryMode: false });
    }

    await refreshAuthState();
  });
}

export async function initializeAuth() {
  if (!initPromise) {
    initPromise = (async () => {
      ensureSubscription();
      await refreshAuthState();
      return cloneState();
    })();
  }

  return initPromise;
}

export function subscribeAuthState(listener) {
  listeners.add(listener);
  listener(cloneState());

  return () => {
    listeners.delete(listener);
  };
}

export function getAuthState() {
  return cloneState();
}

export function getAuthLabel() {
  return getDisplayName(state.user, state.profile);
}

export async function signInWithPassword(email, password) {
  if (!supabase) {
    return { error: new Error('Supabase is not configured.') };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error };
  }

  await refreshAuthState();

  return { data };
}

export async function signUpWithPassword({ fullName, email, password }) {
  if (!supabase) {
    return { error: new Error('Supabase is not configured.') };
  }

  const { firstName, lastName } = splitName(fullName);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        full_name: fullName.trim(),
      },
    },
  });

  if (error) {
    return { error };
  }

  if (data.session) {
    await refreshAuthState();
  }

  return { data };
}

export async function requestPasswordReset(email) {
  if (!supabase) {
    return { error: new Error('Supabase is not configured.') };
  }

  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
}

export async function updatePassword(password) {
  if (!supabase) {
    return { error: new Error('Supabase is not configured.') };
  }

  return supabase.auth.updateUser({ password });
}

export async function signOut() {
  if (!supabase) {
    return { error: new Error('Supabase is not configured.') };
  }

  const response = await supabase.auth.signOut({ scope: 'local' });
  await refreshAuthState();

  return response;
}

export function getNextPath() {
  const searchParams = new URLSearchParams(window.location.search);
  const nextPath = searchParams.get('next');

  return nextPath && nextPath.startsWith('/') ? nextPath : '/';
}