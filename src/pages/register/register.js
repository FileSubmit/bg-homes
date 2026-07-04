import template from './register.html?raw';
import { getNextPath, signUpWithPassword } from '../../lib/auth.js';
import { navigateTo } from '../../router.js';

export function render() {
  return template;
}

function setMessage(root, message, tone = 'error') {
  const messageSlot = root.querySelector('[data-register-message]');

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
  const form = root.querySelector('[data-register-form]');
  const submitButton = root.querySelector('[data-register-submit]');

  if (!form) {
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage(root, '');

    const formData = new FormData(form);
    const fullName = String(formData.get('fullName') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');
    const confirmPassword = String(formData.get('confirmPassword') ?? '');

    if (!fullName || !email || !password) {
      setMessage(root, 'All fields are required.');
      return;
    }

    if (password !== confirmPassword) {
      setMessage(root, 'Passwords do not match.');
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Creating account...';
    }

    const { data, error } = await signUpWithPassword({ fullName, email, password });

    if (error) {
      setMessage(root, error.message || 'Could not create your account.');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Create account';
      }
      return;
    }

    if (data?.session) {
      navigateTo(getNextPath());
      return;
    }

    setMessage(root, 'Account created. Check your email to confirm your address before logging in.', 'success');

    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'Create account';
    }
  });
}