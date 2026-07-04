import template from './profile.html?raw';
import { updateEmail, updatePassword, updateProfile } from '../../lib/auth.js';
import {
  escapeHtml,
  formatPrice,
  isUuid,
  propertyTypeLabels,
  sanitizeUrl,
  statusLabels,
  transactionTypeLabels,
} from '../../lib/format.js';
import {
  coverPhotoUrl,
  deleteProperty,
  fetchOwnProperties,
  setPropertyStatus,
} from '../../lib/properties.js';

export function render() {
  return template;
}

function setMessage(root, selector, message, tone = 'error') {
  const messageSlot = root.querySelector(selector);

  if (!messageSlot) {
    return;
  }

  if (!message) {
    messageSlot.classList.add('hidden');
    messageSlot.textContent = '';
    return;
  }

  const tones = {
    error: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
    success: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  };

  messageSlot.className = `mt-4 whitespace-pre-line rounded-2xl px-4 py-3 text-sm ${tones[tone] ?? tones.error}`;
  messageSlot.textContent = message;
}

function statusBadge(status) {
  const styles = {
    active: 'bg-emerald-50 text-emerald-700',
    archived: 'bg-amber-100 text-amber-800',
    sold: 'bg-slate-200 text-slate-700',
  };

  return `
    <span class="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${styles[status] ?? 'bg-slate-100 text-slate-600'}">
      ${escapeHtml(statusLabels[status] ?? status)}
    </span>
  `;
}

function listingRow(property) {
  const photoUrl = sanitizeUrl(coverPhotoUrl(property));
  const thumb = photoUrl
    ? `<img src="${escapeHtml(photoUrl)}" alt="${escapeHtml(property.title)}" class="h-20 w-28 flex-none rounded-2xl object-cover" loading="lazy" />`
    : '<div class="flex h-20 w-28 flex-none items-center justify-center rounded-2xl bg-slate-100 text-xs font-medium text-slate-400">No photo</div>';

  const toggleLabel = property.status === 'active' ? 'Unpublish' : 'Publish';

  return `
    <article class="flex flex-wrap items-center gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      ${thumb}
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          ${statusBadge(property.status)}
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">
            ${escapeHtml(transactionTypeLabels[property.transaction_type] ?? property.transaction_type)} ·
            ${escapeHtml(propertyTypeLabels[property.property_type] ?? property.property_type)}
          </span>
        </div>
        <a class="mt-2 block truncate text-lg font-semibold text-slate-900 transition hover:text-emerald-700" href="/properties/${escapeHtml(property.id)}">
          ${escapeHtml(property.title)}
        </a>
        <p class="mt-1 text-sm text-slate-500">${escapeHtml([property.city, property.neighborhood].filter(Boolean).join(', '))} · ${formatPrice(property.price, property.currency)}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <a class="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900" href="/properties/${escapeHtml(property.id)}/edit">Edit</a>
        <button type="button" data-action="toggle" data-id="${escapeHtml(property.id)}" data-status="${escapeHtml(property.status)}" class="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900">
          ${toggleLabel}
        </button>
        <button type="button" data-action="delete" data-id="${escapeHtml(property.id)}" data-title="${escapeHtml(property.title)}" class="rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 transition hover:border-rose-500 hover:text-rose-700">
          Delete
        </button>
      </div>
    </article>
  `;
}

export function hydrate(root, params, { authState }) {
  if (!authState?.user) {
    return;
  }

  const profileForm = root.querySelector('[data-profile-form]');
  const emailForm = root.querySelector('[data-email-form]');
  const passwordForm = root.querySelector('[data-password-form]');
  const listingsContainer = root.querySelector('[data-my-properties]');

  if (profileForm) {
    profileForm.elements.namedItem('firstName').value = authState.profile?.first_name ?? '';
    profileForm.elements.namedItem('lastName').value = authState.profile?.last_name ?? '';
    profileForm.elements.namedItem('phone').value = authState.profile?.phone ?? '';

    profileForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      setMessage(root, '[data-profile-message]', '');

      const formData = new FormData(profileForm);
      const firstName = String(formData.get('firstName') ?? '').trim();
      const lastName = String(formData.get('lastName') ?? '').trim();
      const phone = String(formData.get('phone') ?? '').trim();

      if (!firstName || !lastName) {
        setMessage(root, '[data-profile-message]', 'First and last name are required.');
        return;
      }

      if (firstName.length > 80 || lastName.length > 80 || phone.length > 30) {
        setMessage(root, '[data-profile-message]', 'One of the fields is too long.');
        return;
      }

      const submitButton = root.querySelector('[data-profile-submit]');
      submitButton.disabled = true;

      const { error } = await updateProfile({ firstName, lastName, phone });

      submitButton.disabled = false;

      if (error) {
        setMessage(root, '[data-profile-message]', error.message || 'Could not update your details.');
        return;
      }

      setMessage(root, '[data-profile-message]', 'Your details were updated.', 'success');
    });
  }

  if (emailForm) {
    emailForm.elements.namedItem('email').value = authState.user.email ?? '';

    emailForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      setMessage(root, '[data-email-message]', '');

      const email = String(new FormData(emailForm).get('email') ?? '').trim();

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setMessage(root, '[data-email-message]', 'Enter a valid email address.');
        return;
      }

      if (email === authState.user.email) {
        setMessage(root, '[data-email-message]', 'This is already your email address.');
        return;
      }

      const submitButton = root.querySelector('[data-email-submit]');
      submitButton.disabled = true;

      const { error } = await updateEmail(email);

      submitButton.disabled = false;

      if (error) {
        setMessage(root, '[data-email-message]', error.message || 'Could not update your email.');
        return;
      }

      setMessage(root, '[data-email-message]', 'Check your inbox to confirm the new email address.', 'success');
    });
  }

  if (passwordForm) {
    passwordForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      setMessage(root, '[data-password-message]', '');

      const formData = new FormData(passwordForm);
      const password = String(formData.get('password') ?? '');
      const confirmPassword = String(formData.get('confirmPassword') ?? '');

      if (password.length < 8) {
        setMessage(root, '[data-password-message]', 'Password must be at least 8 characters.');
        return;
      }

      if (password !== confirmPassword) {
        setMessage(root, '[data-password-message]', 'Passwords do not match.');
        return;
      }

      const submitButton = root.querySelector('[data-password-submit]');
      submitButton.disabled = true;

      const { error } = await updatePassword(password);

      submitButton.disabled = false;

      if (error) {
        setMessage(root, '[data-password-message]', error.message || 'Could not change your password.');
        return;
      }

      passwordForm.reset();
      setMessage(root, '[data-password-message]', 'Your password was changed.', 'success');
    });
  }

  if (!listingsContainer) {
    return;
  }

  const loadListings = async () => {
    const { data, error } = await fetchOwnProperties(authState.user.id);

    if (error) {
      listingsContainer.innerHTML = '<p class="text-rose-600">Could not load your listings. Please try again later.</p>';
      return;
    }

    if (data.length === 0) {
      listingsContainer.innerHTML = '<p class="text-slate-500">You have no listings yet. Add your first property to get started.</p>';
      return;
    }

    listingsContainer.innerHTML = data.map(listingRow).join('');
  };

  void loadListings();

  listingsContainer.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');

    if (!button || button.disabled) {
      return;
    }

    const { action, id } = button.dataset;

    if (!isUuid(id)) {
      return;
    }

    setMessage(root, '[data-listings-message]', '');

    if (action === 'toggle') {
      const nextStatus = button.dataset.status === 'active' ? 'archived' : 'active';

      button.disabled = true;

      const { error } = await setPropertyStatus(id, nextStatus);

      if (error) {
        button.disabled = false;
        setMessage(root, '[data-listings-message]', error.message || 'Could not update the listing status.');
        return;
      }

      await loadListings();
      return;
    }

    if (action === 'delete') {
      const title = button.dataset.title || 'this listing';

      if (!window.confirm(`Delete "${title}" permanently? This cannot be undone.`)) {
        return;
      }

      button.disabled = true;

      const { error } = await deleteProperty(id);

      if (error) {
        button.disabled = false;
        setMessage(root, '[data-listings-message]', error.message || 'Could not delete the listing.');
        return;
      }

      await loadListings();
    }
  });
}
