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

  return user?.email?.split('@')[0] ?? 'Потребител';
}

function splitName(fullName) {
  const trimmed = fullName.trim().replace(/\s+/g, ' ');

  if (!trimmed) {
    return {
      firstName: 'Потребител',
      lastName: 'Член',
    };
  }

  const [firstName, ...rest] = trimmed.split(' ');

  return {
    firstName: firstName || 'Потребител',
    lastName: rest.length > 0 ? rest.join(' ') : 'Член',
  };
}

const PROFILE_COLUMNS = 'id, first_name, last_name, phone, role, created_at, updated_at';

async function loadProfile(userId) {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data;
}

// The on_auth_user_created DB trigger normally creates the profile row. If it
// is missing (e.g. the trigger migration is not applied yet), create it from
// the client — RLS only allows inserting your own row with role 'user'.
async function ensureProfile(user) {
  const existing = await loadProfile(user.id);

  if (existing) {
    return existing;
  }

  const metadata = user.user_metadata ?? {};
  const fallback = splitName(metadata.full_name ?? user.email?.split('@')[0] ?? '');

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      first_name: metadata.first_name?.trim() || fallback.firstName,
      last_name: metadata.last_name?.trim() || fallback.lastName,
      phone: metadata.phone?.trim() || null,
    })
    .select(PROFILE_COLUMNS)
    .single();

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
      error: 'Задайте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY, за да включите оторизацията.',
    });

    return cloneState();
  }

  setState({ loading: true, error: null });

  const { data, error } = await supabase.auth.getUser();
  const user = error ? null : data.user;
  const profile = user ? await ensureProfile(user) : null;

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
    return { error: new Error('Supabase не е конфигуриран.') };
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
    return { error: new Error('Supabase не е конфигуриран.') };
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
    return { error: new Error('Supabase не е конфигуриран.') };
  }

  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
}

export async function updateProfile({ firstName, lastName, phone }) {
  if (!supabase) {
    return { error: new Error('Supabase не е конфигуриран.') };
  }

  if (!state.user) {
    return { error: new Error('Трябва да сте влезли в профила си.') };
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({
      first_name: firstName,
      last_name: lastName,
      phone: phone || null,
    })
    .eq('id', state.user.id)
    .select('id')
    .maybeSingle();

  if (error) {
    return { error };
  }

  if (!data) {
    return { error: new Error('Профилът не можа да бъде обновен.') };
  }

  await refreshAuthState();

  return { data };
}

export async function updateEmail(email) {
  if (!supabase) {
    return { error: new Error('Supabase не е конфигуриран.') };
  }

  return supabase.auth.updateUser({ email });
}

export async function updatePassword(password) {
  if (!supabase) {
    return { error: new Error('Supabase не е конфигуриран.') };
  }

  return supabase.auth.updateUser({ password });
}

export async function signOut() {
  if (!supabase) {
    return { error: new Error('Supabase не е конфигуриран.') };
  }

  const response = await supabase.auth.signOut({ scope: 'local' });
  await refreshAuthState();

  return response;
}

export function getNextPath() {
  const searchParams = new URLSearchParams(window.location.search);
  const nextPath = searchParams.get('next');

  // Only same-origin absolute paths: reject protocol-relative ("//host") and backslash tricks.
  if (!nextPath || !nextPath.startsWith('/') || nextPath.startsWith('//') || nextPath.includes('\\')) {
    return '/';
  }

  return nextPath;
}