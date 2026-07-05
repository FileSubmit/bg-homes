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

function notFoundMarkup() {
  return `
    <p class="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-600">Имот</p>
    <h1 class="mt-3 text-3xl font-bold tracking-tight text-slate-900">Имотът не е намерен</h1>
    <p class="mt-4 text-slate-600">Тази обява не съществува или вече не е налична.</p>
    <a class="mt-8 inline-flex rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white" href="/properties">Обратно към имотите</a>
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
    <div class="mt-8 rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
      <p class="text-sm font-semibold uppercase tracking-wide text-slate-500">За контакт</p>
      <p class="mt-2 text-lg font-semibold text-slate-900">${name}</p>
      ${phone}
      ${email}
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
    ? `<span class="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800">${escapeHtml(statusLabels[property.status] ?? property.status)}</span>`
    : '';

  const manageActions = canManage
    ? `
      <div class="mt-8 flex flex-wrap gap-3 rounded-2xl bg-slate-50 p-4">
        <span class="w-full text-sm font-medium text-slate-500">Вие управлявате тази обява</span>
        <a class="inline-flex rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900" href="/properties/${escapeHtml(property.id)}/edit">Редактиране на обявата</a>
        <a class="inline-flex rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900" href="/profile">Управление в профила</a>
      </div>
    `
    : '';

  return `
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
    ${isOwner ? '' : contactCardMarkup(property)}
    ${manageActions}
    <a class="mt-10 inline-flex rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800" href="/properties">Обратно към имотите</a>
  `;
}

export function render() {
  return template;
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
  })();
}
