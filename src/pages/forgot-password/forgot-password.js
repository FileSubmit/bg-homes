import './forgot-password.scss';
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
    messageSlot.classList.add('d-none');
    messageSlot.textContent = '';
    return;
  }

  messageSlot.className = `alert ${tone === 'error' ? 'alert-danger' : 'alert-success'} mt-4 rounded-5 px-3 py-6 fs-sm`;
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