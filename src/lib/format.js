export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function sanitizeUrl(value) {
  try {
    const url = new URL(String(value ?? '').trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return UUID_PATTERN.test(String(value ?? ''));
}

export function formatPrice(price, currency) {
  const amount = Number(price);

  if (!Number.isFinite(amount)) {
    return '';
  }

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: String(currency ?? 'EUR').toUpperCase(),
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString('en-US')} ${escapeHtml(currency ?? '')}`;
  }
}

export const transactionTypeLabels = {
  sale: 'For sale',
  rent: 'For rent',
};

export const propertyTypeLabels = {
  apartment: 'Apartment',
  house: 'House',
  villa: 'Villa',
  studio: 'Studio',
  office: 'Office',
  store: 'Store',
  land: 'Land',
  garage: 'Garage',
  other: 'Other',
};

export const constructionTypeLabels = {
  brick: 'Brick',
  panel: 'Panel',
  epk: 'EPK',
  tuf: 'TUF',
  mixed: 'Mixed',
  other: 'Other',
};

export const constructionStageLabels = {
  project: 'Project',
  rough_construction: 'Rough construction',
  act_14: 'Act 14',
  act_15: 'Act 15',
  act_16: 'Act 16',
  turnkey: 'Turnkey',
  renovated: 'Renovated',
  other: 'Other',
};

export const heatingLabels = {
  central: 'Central',
  electric: 'Electric',
  gas: 'Gas',
  air_conditioning: 'Air conditioning',
  pellet: 'Pellet',
  wood: 'Wood',
  other: 'Other',
};

export const furnishingLabels = {
  unfurnished: 'Unfurnished',
  partially_furnished: 'Partially furnished',
  furnished: 'Furnished',
};

export const statusLabels = {
  active: 'Published',
  archived: 'Unpublished',
  sold: 'Sold',
};
