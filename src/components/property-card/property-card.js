import './property-card.scss';
import {
  escapeHtml,
  formatPrice,
  propertyTypeLabels,
  sanitizeUrl,
  transactionTypeLabels,
} from '../../lib/format.js';
import { coverPhotoUrl } from '../../lib/properties.js';

function cardImage(property) {
  const photoUrl = sanitizeUrl(coverPhotoUrl(property));

  if (!photoUrl) {
    return `
      <div class="property-card-photo d-flex align-items-center justify-content-center rounded-5 bg-gradient-slate-100-200 fs-sm fw-medium text-slate-400">
        Няма снимка
      </div>
    `;
  }

  return `
    <img
      src="${escapeHtml(photoUrl)}"
      alt="${escapeHtml(property.title)}"
      class="property-card-photo w-100 rounded-5 object-fit-cover"
      loading="lazy"
    />
  `;
}

export function propertyCard(property) {
  const location = [property.city, property.neighborhood].filter(Boolean).map(escapeHtml).join(', ');
  const area = property.net_area ? `${escapeHtml(property.net_area)} m²` : '-';
  const bedrooms = property.bedrooms ?? '-';

  return `
    <article class="property-card d-flex flex-column rounded-3xl bg-white p-7 shadow-sm ring-1 ring-slate-200 transition hover-lift hover-shadow-lg">
      <a href="/properties/${escapeHtml(property.id)}" class="d-block">${cardImage(property)}</a>
      <div class="mt-3 d-flex align-items-center gap-2">
        <span class="rounded-pill bg-emerald-50 px-6 py-1 fs-xs fw-semibold text-uppercase tracking-wide text-emerald-700">
          ${escapeHtml(transactionTypeLabels[property.transaction_type] ?? property.transaction_type)}
        </span>
        <span class="rounded-pill bg-slate-100 px-6 py-1 fs-xs fw-semibold text-uppercase tracking-wide text-slate-600">
          ${escapeHtml(propertyTypeLabels[property.property_type] ?? property.property_type)}
        </span>
      </div>
      <h2 class="mt-6 fs-5 fw-semibold text-slate-900">${escapeHtml(property.title)}</h2>
      <p class="mt-1 fs-sm text-slate-500">${location}</p>
      <p class="mt-6 fs-4 fw-bold text-slate-900">${formatPrice(property.price, property.currency)}</p>
      <dl class="mt-6 row row-cols-2 g-6 fs-sm text-slate-600">
        <div class="col"><dt class="fw-medium text-slate-900">Спални</dt><dd>${escapeHtml(bedrooms)}</dd></div>
        <div class="col"><dt class="fw-medium text-slate-900">Площ</dt><dd>${area}</dd></div>
      </dl>
      <a class="mt-11 d-inline-flex align-self-start rounded-pill bg-slate-900 px-7 py-18 fs-sm fw-semibold text-white transition hover-bg-slate-800" href="/properties/${escapeHtml(property.id)}">
        Виж детайли
      </a>
    </article>
  `;
}
