import './reset-password.scss';
import template from './reset-password.html?raw';
import { getAuthState, updatePassword } from '../../lib/auth.js';
import { navigateTo } from '../../router.js';

export function render() {
  const authState = getAuthState();

  if (!authState.user) {
    return `
      <section class="mx-auto max-w-2xl px-3 py-13 px-sm-4 px-lg-9">
        <div class="rounded-3xl bg-white p-9 shadow-sm ring-1 ring-slate-200 p-sm-11">
          <p class="fs-sm fw-semibold text-uppercase tracking-widest-lg text-emerald-600">Възстановяване на профил</p>
          <h1 class="mt-6 fs-3 fw-bold tracking-tight text-slate-900">Нова парола</h1>
          <p class="mt-3 text-slate-600">Първо отворете линка за нова парола от имейла си. След това ще можете да зададете нова парола тук.</p>
          <a class="mt-9 btn btn-primary rounded-pill px-4 py-6 fs-sm fw-semibold hover-bg-slate-800" href="/forgot-password">Заявка за линк</a>
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
    messageSlot.classList.add('d-none');
    messageSlot.textContent = '';
    return;
  }

  messageSlot.className = `alert ${tone === 'error' ? 'alert-danger' : 'alert-success'} mt-4 rounded-5 px-3 py-6 fs-sm`;
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
      setMessage(root, 'И двете полета за парола са задължителни.');
      return;
    }

    if (password !== confirmPassword) {
      setMessage(root, 'Паролите не съвпадат.');
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Запазване…';
    }

    const { error } = await updatePassword(password);

    if (error) {
      setMessage(root, error.message || 'Паролата не можа да бъде обновена.');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Смяна на паролата';
      }
      return;
    }

    setMessage(root, 'Паролата ви беше обновена.', 'success');
    navigateTo('/');
  });
}