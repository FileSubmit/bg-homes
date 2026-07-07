import './register.scss';
import template from './register.html?raw';
import { getNextPath, signUpWithPassword } from '../../lib/auth.js';
import { getHcaptchaResponse, renderHcaptcha, resetHcaptcha } from '../../lib/hcaptcha.js';
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
    messageSlot.classList.add('d-none');
    messageSlot.textContent = '';
    return;
  }

  messageSlot.className = `alert ${tone === 'error' ? 'alert-danger' : 'alert-success'} mt-4 rounded-5 px-3 py-6 fs-sm`;
  messageSlot.textContent = message;
}

export function hydrate(root) {
  const form = root.querySelector('[data-register-form]');
  const submitButton = root.querySelector('[data-register-submit]');
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
    const fullName = String(formData.get('fullName') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');
    const confirmPassword = String(formData.get('confirmPassword') ?? '');

    if (!fullName || !email || !password) {
      setMessage(root, 'Всички полета са задължителни.');
      return;
    }

    if (password !== confirmPassword) {
      setMessage(root, 'Паролите не съвпадат.');
      return;
    }

    const captchaToken = widgetId !== null ? await getHcaptchaResponse(widgetId) : '';

    if (!captchaToken) {
      setMessage(root, 'Моля, потвърдете, че не сте робот.');
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Създаване на профил…';
    }

    const { data, error } = await signUpWithPassword({ fullName, email, password, captchaToken });

    resetHcaptcha(widgetId);

    if (error) {
      setMessage(root, error.message || 'Профилът не можа да бъде създаден.');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Създаване на профил';
      }
      return;
    }

    if (data?.session) {
      navigateTo(getNextPath());
      return;
    }

    setMessage(root, 'Профилът е създаден. Проверете имейла си, за да потвърдите адреса, преди да влезете.', 'success');

    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'Създаване на профил';
    }
  });
}