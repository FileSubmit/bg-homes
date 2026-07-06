import template from './login.html?raw';
import { getNextPath, signInWithPassword } from '../../lib/auth.js';
import { getHcaptchaResponse, renderHcaptcha, resetHcaptcha } from '../../lib/hcaptcha.js';
import { navigateTo } from '../../router.js';

export function render() {
  return template;
}

function setMessage(root, message, tone = 'error') {
  const messageSlot = root.querySelector('[data-login-message]');

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
  const form = root.querySelector('[data-login-form]');
  const submitButton = root.querySelector('[data-login-submit]');
  const captchaContainer = root.querySelector('[data-hcaptcha]');

  if (!form) {
    return;
  }

  let widgetId = null;

  if (captchaContainer) {
    renderHcaptcha(captchaContainer)
      .then((id) => {
        widgetId = id;
      })
      .catch((error) => {
        setMessage(root, error.message || 'Проверката за сигурност не можа да се зареди.');
      });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage(root, '');

    const formData = new FormData(form);
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');

    if (!email || !password) {
      setMessage(root, 'Всички полета са задължителни.');
      return;
    }

    const captchaToken = widgetId !== null ? await getHcaptchaResponse(widgetId) : '';

    if (!captchaToken) {
      setMessage(root, 'Моля, потвърдете, че не сте робот.');
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Влизане…';
    }

    const { error } = await signInWithPassword(email, password, captchaToken);

    resetHcaptcha(widgetId);

    if (error) {
      setMessage(root, error.message || 'Невалиден имейл или парола.');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Влизане';
      }
      return;
    }

    navigateTo(getNextPath());
  });
}