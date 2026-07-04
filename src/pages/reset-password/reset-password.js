import template from './reset-password.html?raw';
import { getAuthState, updatePassword } from '../../lib/auth.js';
import { navigateTo } from '../../router.js';

export function render() {
  const authState = getAuthState();

  if (!authState.user) {
    return `
      <section class="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <div class="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 sm:p-10">
          <p class="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-600">Account recovery</p>
          <h1 class="mt-3 text-3xl font-bold tracking-tight text-slate-900">Reset password</h1>
          <p class="mt-4 text-slate-600">Open the reset link from your email first. After that you can set a new password here.</p>
          <a class="mt-8 inline-flex rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white" href="/forgot-password">Request a reset link</a>
        </div>
      </section>
    `;
  }

  return template;
}

function setMessage(root, message, tone = 'error') {
  const messageSlot = root.querySelector('[data-reset-message]');

  if (!messageSlot) {
    return;
  }

  if (!message) {
    messageSlot.classList.add('hidden');
    messageSlot.textContent = '';
    return;
  }

  messageSlot.className = `mt-6 rounded-2xl px-4 py-3 text-sm ${tone === 'error' ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'}`;
  messageSlot.textContent = message;
}

export function hydrate(root) {
  const form = root.querySelector('[data-reset-form]');
  const submitButton = root.querySelector('[data-reset-submit]');

  if (!form) {
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage(root, '');

    const formData = new FormData(form);
    const password = String(formData.get('password') ?? '');
    const confirmPassword = String(formData.get('confirmPassword') ?? '');

    if (!password || !confirmPassword) {
      setMessage(root, 'Both password fields are required.');
      return;
    }

    if (password !== confirmPassword) {
      setMessage(root, 'Passwords do not match.');
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Saving...';
    }

    const { error } = await updatePassword(password);

    if (error) {
      setMessage(root, error.message || 'Could not update your password.');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Update password';
      }
      return;
    }

    setMessage(root, 'Your password has been updated.', 'success');
    navigateTo('/');
  });
}