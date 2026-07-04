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
      <div class="flex h-44 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-sm font-medium text-slate-400">
        No photo
      </div>
    `;
  }

  return `
    <img
      src="${escapeHtml(photoUrl)}"
      alt="${escapeHtml(property.title)}"
      class="h-44 w-full rounded-2xl object-cover"
      loading="lazy"
    />
  `;
}

export function propertyCard(property) {
  const location = [property.city, property.neighborhood].filter(Boolean).map(escapeHtml).join(', ');
  const area = property.net_area ? `${escapeHtml(property.net_area)} m²` : '—';
  const bedrooms = property.bedrooms ?? '—';

  return `
    <article class="flex flex-col rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-lg">
      ${cardImage(property)}
      <div class="mt-4 flex items-center gap-2">
        <span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
          ${escapeHtml(transactionTypeLabels[property.transaction_type] ?? property.transaction_type)}
        </span>
        <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
          ${escapeHtml(propertyTypeLabels[property.property_type] ?? property.property_type)}
        </span>
      </div>
      <h2 class="mt-3 text-xl font-semibold text-slate-900">${escapeHtml(property.title)}</h2>
      <p class="mt-1 text-sm text-slate-500">${location}</p>
      <p class="mt-3 text-2xl font-bold text-slate-900">${formatPrice(property.price, property.currency)}</p>
      <dl class="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-600">
        <div><dt class="font-medium text-slate-900">Bedrooms</dt><dd>${escapeHtml(bedrooms)}</dd></div>
        <div><dt class="font-medium text-slate-900">Area</dt><dd>${area}</dd></div>
      </dl>
      <a class="mt-5 inline-flex self-start rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800" href="/properties/${escapeHtml(property.id)}">
        View details
      </a>
    </article>
  `;
}
