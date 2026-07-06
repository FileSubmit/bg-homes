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
    return new Intl.NumberFormat('bg-BG', {
      style: 'currency',
      currency: String(currency ?? 'EUR').toUpperCase(),
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString('bg-BG')} ${escapeHtml(currency ?? '')}`;
  }
}

export const transactionTypeLabels = {
  sale: 'Продава',
  rent: 'Отдава под наем',
};

export const propertyTypeLabels = {
  apartment: 'Апартамент',
  house: 'Къща',
  villa: 'Вила',
  studio: 'Студио',
  office: 'Офис',
  store: 'Магазин',
  land: 'Парцел',
  garage: 'Гараж',
  other: 'Друго',
};

export const constructionTypeLabels = {
  brick: 'Тухла',
  panel: 'Панел',
  epk: 'ЕПК',
  tuf: 'ПК (ТУФ)',
  mixed: 'Смесена',
  other: 'Друго',
};

export const constructionStageLabels = {
  project: 'Проект',
  rough_construction: 'Груб строеж',
  act_14: 'Акт 14',
  act_15: 'Акт 15',
  act_16: 'Акт 16',
  turnkey: 'Ново строителство',
  renovated: 'Реновиран',
  other: 'Друго',
};

export const heatingLabels = {
  central: 'Централно',
  electric: 'Електричество',
  gas: 'Газ',
  air_conditioning: 'Климатик',
  pellet: 'Пелети',
  wood: 'Дърва',
  other: 'Друго',
};

export const furnishingLabels = {
  unfurnished: 'Необзаведен',
  partially_furnished: 'Частично обзаведен',
  furnished: 'Обзаведен',
};

export const statusLabels = {
  active: 'Публикуван',
  archived: 'Скрит',
  sold: 'Продаден',
};

export const currencyLabels = {
  EUR: 'EUR',
  USD: 'USD',
};

export const roleLabels = {
  user: 'Потребител',
  admin: 'Администратор',
};

export const inquiryStatusLabels = {
  unread: 'Непрочетено',
  read: 'Прочетено',
  replied: 'Отговорено',
};

export function formatDate(value) {
  if (!value) {
    return '—';
  }

  try {
    return new Intl.DateTimeFormat('bg-BG', { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return '—';
  }
}
