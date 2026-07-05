import template from './forgot-password.html?raw';
import { requestPasswordReset } from '../../lib/auth.js';

export function render() {
  return template;
}

function setMessage(root, message, tone = 'error') {
  const messageSlot = root.querySelector('[data-forgot-message]');

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
  const form = root.querySelector('[data-forgot-form]');
  const submitButton = root.querySelector('[data-forgot-submit]');

  if (!form) {
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage(root, '');

    const formData = new FormData(form);
    const email = String(formData.get('email') ?? '').trim();

    if (!email) {
      setMessage(root, 'Въведете имейл адрес.');
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Изпращане…';
    }

    const { error } = await requestPasswordReset(email);

    if (error) {
      setMessage(root, error.message || 'Имейлът за нова парола не можа да бъде изпратен.');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Изпращане на линк';
      }
      return;
    }

    setMessage(root, 'Ако имейлът съществува, изпратихме линк за нова парола.', 'success');

    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'Изпращане на линк';
    }
  });
}