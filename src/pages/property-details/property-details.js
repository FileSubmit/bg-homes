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
import {
  fetchFeatures,
  fetchOwnerProperties,
  fetchPropertyById,
  fetchSimilarProperties,
  sortedPhotos,
} from '../../lib/properties.js';
import { sendPropertyMessage } from '../../lib/messages.js';
import { refreshUnreadBadge } from '../../components/header/header.js';
import { propertyCard } from '../../components/property-card/property-card.js';

function notFoundMarkup() {
  return `
    <div class="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 sm:p-10">
      <p class="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-600">Имот</p>
      <h1 class="mt-3 text-3xl font-bold tracking-tight text-slate-900">Имотът не е намерен</h1>
      <p class="mt-4 text-slate-600">Тази обява не съществува или вече не е налична.</p>
      <a class="mt-8 inline-flex rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white" href="/properties">Обратно към имотите</a>
    </div>
  `;
}

function factTile(label, value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  return `
    <div class="rounded-2xl bg-slate-50 p-4">
      <p class="text-sm text-slate-500">${escapeHtml(label)}</p>
      <p class="mt-2 text-lg font-semibold text-slate-900">${escapeHtml(value)}</p>
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
    <div class="mt-8 grid gap-4 sm:grid-cols-2">
      ${photos
        .map(
          (photoUrl, index) => `
            <img
              src="${escapeHtml(photoUrl)}"
              alt="${escapeHtml(property.title)} снимка ${index + 1}"
              class="${index === 0 ? 'sm:col-span-2 h-80' : 'h-56'} w-full rounded-2xl object-cover"
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
    <div class="mt-8">
      <h2 class="text-lg font-semibold text-slate-900">Особености</h2>
      <ul class="mt-3 flex flex-wrap gap-2">
        ${names
          .map(
            (name) => `
              <li class="rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700">${escapeHtml(name)}</li>
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
    ? `<a class="mt-1 block text-slate-600 transition hover:text-slate-900" href="tel:${escapeHtml(owner.phone)}">${escapeHtml(owner.phone)}</a>`
    : '';
  const email = owner.email
    ? `<a class="mt-1 block text-slate-600 transition hover:text-slate-900" href="mailto:${escapeHtml(owner.email)}">${escapeHtml(owner.email)}</a>`
    : '';

  return `
    <div class="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
      <p class="text-sm font-semibold uppercase tracking-wide text-slate-500">За контакт</p>
      <p class="mt-2 text-lg font-semibold text-slate-900">${name}</p>
      ${phone}
      ${email}
    </div>
  `;
}

function messageFormMarkup(property, authState) {
  if (!authState?.user) {
    return `
      <div class="rounded-2xl bg-white p-5 text-center ring-1 ring-slate-200">
        <p class="text-sm text-slate-600">Влезте в профила си, за да изпратите съобщение на автора на обявата.</p>
        <a
          class="mt-3 inline-flex rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          href="/login?next=${encodeURIComponent(`/properties/${property.id}`)}"
        >
          Вход
        </a>
      </div>
    `;
  }

  return `
    <div class="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
      <p class="text-sm font-semibold uppercase tracking-wide text-slate-500">Изпратете съобщение</p>
      <p data-message-form-message class="hidden"></p>
      <form data-message-form class="mt-4 space-y-3">
        <textarea
          name="body"
          rows="4"
          maxlength="4000"
          required
          placeholder="Здравейте, интересувам се от този имот…"
          class="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
        ></textarea>
        <button
          type="submit"
          data-message-submit
          class="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Изпрати съобщение
        </button>
      </form>
    </div>
  `;
}

function relatedPropertiesSection(heading, properties) {
  if (!properties || properties.length === 0) {
    return '';
  }

  return `
    <section class="mt-10">
      <h2 class="text-2xl font-bold tracking-tight text-slate-900">${heading}</h2>
      <div class="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        ${properties.map(propertyCard).join('')}
      </div>
    </section>
  `;
}

function propertyDetailsMarkup(property, featureNamesById, authState, relatedProperties = {}) {
  const isOwner = Boolean(authState?.user) && property.owner_id === authState.user.id;
  const canManage = isOwner || Boolean(authState?.isAdmin);
  const location = [property.address, property.neighborhood, property.city, property.region]
    .filter(Boolean)
    .map(escapeHtml)
    .join(', ');

  const statusBadge = property.status !== 'active'
    ? `<span class="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800">${escapeHtml(statusLabels[property.status] ?? property.status)}</span>`
    : '';

  const manageActions = canManage
    ? `
      <div class="flex flex-wrap gap-3 rounded-2xl bg-slate-50 p-4">
        <span class="w-full text-sm font-medium text-slate-500">Вие управлявате тази обява</span>
        <a class="inline-flex rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900" href="/properties/${escapeHtml(property.id)}/edit">Редактиране на обявата</a>
        <a class="inline-flex rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900" href="/profile">Управление в профила</a>
      </div>
    `
    : '';

  const sidebarBlocks = [manageActions, isOwner ? '' : `${contactCardMarkup(property)}${messageFormMarkup(property, authState)}`]
    .filter(Boolean)
    .join('');

  return `
    <div class="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
      <div class="min-w-0 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 sm:p-10">
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            ${escapeHtml(transactionTypeLabels[property.transaction_type] ?? property.transaction_type)}
          </span>
          <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            ${escapeHtml(propertyTypeLabels[property.property_type] ?? property.property_type)}
          </span>
          ${statusBadge}
        </div>
        <h1 class="mt-4 text-4xl font-bold tracking-tight text-slate-900">${escapeHtml(property.title)}</h1>
        <p class="mt-3 text-lg text-slate-600">${location}</p>
        <p class="mt-6 text-4xl font-bold text-slate-900">${formatPrice(property.price, property.currency)}</p>
        ${photosMarkup(property)}
        <div class="mt-8 grid gap-4 sm:grid-cols-3">
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
          <div class="mt-8">
            <h2 class="text-lg font-semibold text-slate-900">Описание</h2>
            <p class="mt-3 max-w-3xl whitespace-pre-line text-base leading-8 text-slate-600">${escapeHtml(property.description)}</p>
          </div>
        ` : ''}
        <a class="mt-10 inline-flex rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800" href="/properties">Обратно към имотите</a>
      </div>
      ${sidebarBlocks ? `<aside class="space-y-6 lg:sticky lg:top-24">${sidebarBlocks}</aside>` : ''}
    </div>
    ${relatedPropertiesSection('Още имоти в района', relatedProperties.similar)}
    ${relatedPropertiesSection('Други обяви от този потребител', relatedProperties.byOwner)}
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
      messageSlot.classList.add('hidden');
      messageSlot.textContent = '';
      return;
    }

    const tones = {
      error: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
      success: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    };

    messageSlot.className = `mt-4 rounded-2xl px-4 py-3 text-sm ${tones[tone] ?? tones.error}`;
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

    const [{ data: similar }, { data: byOwner }] = await Promise.all([
      fetchSimilarProperties(property, { limit: 3 }),
      fetchOwnerProperties(property.owner_id, { excludeId: property.id, limit: 3 }),
    ]);

    details.innerHTML = propertyDetailsMarkup(property, featureNamesById, authState, { similar, byOwner });

    const isOwner = Boolean(authState?.user) && property.owner_id === authState.user.id;

    if (!isOwner && authState?.user) {
      wireMessageForm(details, property, authState);
    }
  })();
}
