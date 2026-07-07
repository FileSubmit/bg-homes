import './property-details.scss';
import template from './property-details.html?raw';
import {
  constructionStageLabels,
  constructionTypeLabels,
  escapeHtml,
  formatPrice,
  furnishingLabels,
  heatingLabels,
  propertyTypeLabels,
  sanitizeUrl,
  statusLabels,
  transactionTypeLabels,
} from '../../lib/format.js';
import { fetchFeatures, fetchPropertyById, sortedPhotos } from '../../lib/properties.js';
import { sendPropertyMessage } from '../../lib/messages.js';
import { refreshUnreadBadge } from '../../components/header/header.js';

function notFoundMarkup() {
  return `
    <div class="rounded-3xl bg-white p-9 p-sm-11 shadow-sm ring-1 ring-slate-200">
      <p class="fs-sm fw-semibold text-uppercase tracking-widest-lg text-emerald-600">Имот</p>
      <h1 class="mt-6 fs-3 fw-bold tracking-tight text-slate-900">Имотът не е намерен</h1>
      <p class="mt-3 text-slate-600">Тази обява не съществува или вече не е налична.</p>
      <a class="mt-9 btn btn-dark rounded-pill px-7 py-18 fs-sm fw-semibold" href="/properties">Обратно към имотите</a>
    </div>
  `;
}

function factTile(label, value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  return `
    <div class="col rounded-5 bg-slate-50 p-3">
      <p class="fs-sm text-slate-500">${escapeHtml(label)}</p>
      <p class="mt-2 fs-6 fw-semibold text-slate-900">${escapeHtml(value)}</p>
    </div>
  `;
}

function photosMarkup(property) {
  const photos = sortedPhotos(property)
    .map((photo) => sanitizeUrl(photo.photo_url))
    .filter(Boolean);

  if (photos.length === 0) {
    return '';
  }

  return `
    <div class="mt-9 row row-cols-1 row-cols-sm-2 g-3">
      ${photos
        .map(
          (photoUrl, index) => `
            <img
              src="${escapeHtml(photoUrl)}"
              alt="${escapeHtml(property.title)} снимка ${index + 1}"
              class="${index === 0 ? 'col-sm-12 h-80' : 'col h-56'} w-100 rounded-5 object-fit-cover"
              loading="lazy"
            />
          `,
        )
        .join('')}
    </div>
  `;
}

function featuresMarkup(property, featureNamesById) {
  const names = (property.property_features ?? [])
    .map((row) => featureNamesById.get(row.feature_id))
    .filter(Boolean);

  if (names.length === 0) {
    return '';
  }

  return `
    <div class="mt-9">
      <h2 class="fs-6 fw-semibold text-slate-900">Особености</h2>
      <ul class="mt-6 d-flex flex-wrap gap-2 list-unstyled">
        ${names
          .map(
            (name) => `
              <li class="rounded-pill bg-emerald-50 px-3 py-17 fs-sm fw-medium text-emerald-700">${escapeHtml(name)}</li>
            `,
          )
          .join('')}
      </ul>
    </div>
  `;
}

function contactCardMarkup(property) {
  const owner = property.owner;
  const name = [owner?.first_name, owner?.last_name].filter(Boolean).map(escapeHtml).join(' ');

  if (!owner || !name) {
    return '';
  }

  const phone = owner.phone
    ? `<a class="mt-1 d-block text-slate-600 transition hover-text-slate-900" href="tel:${escapeHtml(owner.phone)}">${escapeHtml(owner.phone)}</a>`
    : '';
  const email = owner.email
    ? `<a class="mt-1 d-block text-slate-600 transition hover-text-slate-900" href="mailto:${escapeHtml(owner.email)}">${escapeHtml(owner.email)}</a>`
    : '';

  return `
    <div class="rounded-5 bg-slate-50 p-7 ring-1 ring-slate-200">
      <p class="fs-sm fw-semibold text-uppercase tracking-wide text-slate-500">За контакт</p>
      <p class="mt-2 fs-6 fw-semibold text-slate-900">${name}</p>
      ${phone}
      ${email}
    </div>
  `;
}

function messageFormMarkup(property, authState) {
  if (!authState?.user) {
    return `
      <div class="rounded-5 bg-white p-7 text-center ring-1 ring-slate-200">
        <p class="fs-sm text-slate-600">Влезте в профила си, за да изпратите съобщение на автора на обявата.</p>
        <a
          class="mt-6 btn btn-dark rounded-pill px-7 py-2 fs-sm fw-semibold"
          href="/login?next=${encodeURIComponent(`/properties/${property.id}`)}"
        >
          Вход
        </a>
      </div>
    `;
  }

  return `
    <div class="rounded-5 bg-white p-7 ring-1 ring-slate-200">
      <p class="fs-sm fw-semibold text-uppercase tracking-wide text-slate-500">Изпратете съобщение</p>
      <p data-message-form-message class="d-none"></p>
      <form data-message-form class="mt-3 space-y-3">
        <textarea
          name="body"
          rows="4"
          maxlength="4000"
          required
          placeholder="Здравейте, интересувам се от този имот…"
          class="form-control message-textarea rounded-5 border-slate-300 px-3 py-6 fs-sm text-slate-900 outline-none transition"
        ></textarea>
        <button
          type="submit"
          data-message-submit
          class="btn btn-success rounded-pill px-7 py-18 fs-sm fw-semibold"
        >
          Изпрати съобщение
        </button>
      </form>
    </div>
  `;
}

function propertyDetailsMarkup(property, featureNamesById, authState) {
  const isOwner = Boolean(authState?.user) && property.owner_id === authState.user.id;
  const canManage = isOwner || Boolean(authState?.isAdmin);
  const location = [property.address, property.neighborhood, property.city, property.region]
    .filter(Boolean)
    .map(escapeHtml)
    .join(', ');

  const statusBadge = property.status !== 'active'
    ? `<span class="rounded-pill bg-amber-100 px-6 py-1 fs-xs fw-semibold text-uppercase tracking-wide text-amber-800">${escapeHtml(statusLabels[property.status] ?? property.status)}</span>`
    : '';

  const manageActions = canManage
    ? `
      <div class="d-flex flex-wrap gap-6 rounded-5 bg-slate-50 p-3">
        <span class="w-100 fs-sm fw-medium text-slate-500">Вие управлявате тази обява</span>
        <a class="btn btn-outline-secondary rounded-pill px-7 py-2 fs-sm fw-semibold" href="/properties/${escapeHtml(property.id)}/edit">Редактиране на обявата</a>
        <a class="btn btn-outline-secondary rounded-pill px-7 py-2 fs-sm fw-semibold" href="/profile">Управление в профила</a>
      </div>
    `
    : '';

  const sidebarBlocks = [manageActions, isOwner ? '' : `${contactCardMarkup(property)}${messageFormMarkup(property, authState)}`]
    .filter(Boolean)
    .join('');

  return `
    <div class="property-details-grid gap-9">
      <div class="min-w-0 rounded-3xl bg-white p-9 p-sm-11 shadow-sm ring-1 ring-slate-200">
        <div class="d-flex flex-wrap align-items-center gap-2">
          <span class="rounded-pill bg-emerald-50 px-6 py-1 fs-xs fw-semibold text-uppercase tracking-wide text-emerald-700">
            ${escapeHtml(transactionTypeLabels[property.transaction_type] ?? property.transaction_type)}
          </span>
          <span class="rounded-pill bg-slate-100 px-6 py-1 fs-xs fw-semibold text-uppercase tracking-wide text-slate-600">
            ${escapeHtml(propertyTypeLabels[property.property_type] ?? property.property_type)}
          </span>
          ${statusBadge}
        </div>
        <h1 class="mt-3 fs-2 fw-bold tracking-tight text-slate-900">${escapeHtml(property.title)}</h1>
        <p class="mt-6 fs-6 text-slate-600">${location}</p>
        <p class="mt-4 fs-2 fw-bold text-slate-900">${formatPrice(property.price, property.currency)}</p>
        ${photosMarkup(property)}
        <div class="mt-9 row row-cols-1 row-cols-sm-3 g-3">
          ${factTile('Полезна площ', property.net_area ? `${property.net_area} m²` : null)}
          ${factTile('Обща площ', property.gross_area ? `${property.gross_area} m²` : null)}
          ${factTile('Спални', property.bedrooms)}
          ${factTile('Бани', property.bathrooms)}
          ${factTile('Етаж', property.floor !== null && property.total_floors ? `${property.floor} от ${property.total_floors}` : property.floor)}
          ${factTile('Конструкция', constructionTypeLabels[property.construction_type])}
          ${factTile('Година на строеж', property.construction_year)}
          ${factTile('Етап на строителство', constructionStageLabels[property.construction_stage])}
          ${factTile('Отопление', heatingLabels[property.heating])}
          ${factTile('Обзавеждане', furnishingLabels[property.furnishing])}
        </div>
        ${featuresMarkup(property, featureNamesById)}
        ${property.description ? `
          <div class="mt-9">
            <h2 class="fs-6 fw-semibold text-slate-900">Описание</h2>
            <p class="mt-6 max-w-3xl whitespace-pre-line lh-8 text-slate-600">${escapeHtml(property.description)}</p>
          </div>
        ` : ''}
        <a class="mt-11 btn btn-dark rounded-pill px-7 py-18 fs-sm fw-semibold" href="/properties">Обратно към имотите</a>
      </div>
      ${sidebarBlocks ? `<aside class="space-y-6 property-sidebar">${sidebarBlocks}</aside>` : ''}
    </div>
  `;
}

export function render() {
  return template;
}

function wireMessageForm(details, property, authState) {
  const form = details.querySelector('[data-message-form]');

  if (!form) {
    return;
  }

  const messageSlot = details.querySelector('[data-message-form-message]');

  const setFormMessage = (message, tone = 'error') => {
    if (!messageSlot) {
      return;
    }

    if (!message) {
      messageSlot.classList.add('d-none');
      messageSlot.textContent = '';
      return;
    }

    const tones = {
      error: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
      success: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    };

    messageSlot.className = `mt-3 rounded-5 px-3 py-6 fs-sm ${tones[tone] ?? tones.error}`;
    messageSlot.textContent = message;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setFormMessage('');

    const body = String(new FormData(form).get('body') ?? '').trim();

    if (!body) {
      setFormMessage('Въведете съобщение.');
      return;
    }

    const submitButton = form.querySelector('[data-message-submit]');
    submitButton.disabled = true;

    const { error } = await sendPropertyMessage({
      propertyId: property.id,
      ownerId: property.owner_id,
      senderId: authState.user.id,
      body,
    });

    submitButton.disabled = false;

    if (error) {
      setFormMessage(error.message || 'Съобщението не можа да бъде изпратено.');
      return;
    }

    form.reset();
    setFormMessage('Съобщението е изпратено.', 'success');
    void refreshUnreadBadge();
  });
}

export function hydrate(root, params, { authState } = {}) {
  const details = root.querySelector('[data-property-details]');

  if (!details) {
    return;
  }

  details.innerHTML = '<p class="text-slate-500">Зареждане на обявата…</p>';

  void (async () => {
    const [{ data: property, error }, { data: features }] = await Promise.all([
      fetchPropertyById(params.id),
      fetchFeatures(),
    ]);

    if (error || !property) {
      details.innerHTML = notFoundMarkup();
      return;
    }

    const featureNamesById = new Map(features.map((feature) => [feature.id, feature.name]));

    details.innerHTML = propertyDetailsMarkup(property, featureNamesById, authState);

    const isOwner = Boolean(authState?.user) && property.owner_id === authState.user.id;

    if (!isOwner && authState?.user) {
      wireMessageForm(details, property, authState);
    }
  })();
}
