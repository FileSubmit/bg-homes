import template from './admin.html?raw';
import { buildAdminStats, fetchAllInquiries, fetchAllPropertiesForAdmin, fetchAllProfiles } from '../../lib/admin.js';
import { deleteProperty, setPropertyStatus } from '../../lib/properties.js';
import {
  escapeHtml,
  formatDate,
  formatPrice,
  inquiryStatusLabels,
  isUuid,
  propertyTypeLabels,
  roleLabels,
  statusLabels,
  transactionTypeLabels,
} from '../../lib/format.js';

export function render() {
  return template;
}

function fullName(person) {
  const name = [person?.first_name, person?.last_name].filter(Boolean).join(' ').trim();
  return name || person?.email || 'Няма данни';
}

function statCard(label, value) {
  return `
    <div class="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
      <p class="text-sm text-slate-500">${escapeHtml(label)}</p>
      <p class="mt-2 text-2xl font-semibold text-slate-900">${escapeHtml(String(value))}</p>
    </div>
  `;
}

function breakdownRow(label, count, total) {
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;

  return `
    <div>
      <div class="flex items-center justify-between text-sm">
        <span class="text-slate-600">${escapeHtml(label)}</span>
        <span class="font-semibold text-slate-900">${count}</span>
      </div>
      <div class="mt-1 h-2 rounded-full bg-slate-100">
        <div class="h-2 rounded-full bg-emerald-500" style="width: ${percent}%"></div>
      </div>
    </div>
  `;
}

function emptyState(message) {
  return `<p class="text-sm text-slate-500">${escapeHtml(message)}</p>`;
}

function badge(text, tone) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-100 text-amber-800',
    slate: 'bg-slate-200 text-slate-700',
    rose: 'bg-rose-50 text-rose-700',
  };

  return `<span class="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${tones[tone] ?? tones.slate}">${escapeHtml(text)}</span>`;
}

function statusBadge(status) {
  const tones = { active: 'emerald', archived: 'amber', sold: 'slate' };
  return badge(statusLabels[status] ?? status, tones[status]);
}

function roleBadge(role) {
  return badge(roleLabels[role] ?? role, role === 'admin' ? 'emerald' : 'slate');
}

function inquiryStatusBadge(status) {
  const tones = { unread: 'rose', read: 'amber', replied: 'emerald' };
  return badge(inquiryStatusLabels[status] ?? status, tones[status]);
}

function setActiveTab(root, tab) {
  root.querySelectorAll('[data-tab-button]').forEach((button) => {
    const isActive = button.dataset.tabButton === tab;
    button.classList.toggle('bg-emerald-50', isActive);
    button.classList.toggle('text-emerald-700', isActive);
    button.classList.toggle('text-slate-600', !isActive);
  });

  root.querySelectorAll('[data-tab-panel]').forEach((panel) => {
    panel.classList.toggle('hidden', panel.dataset.tabPanel !== tab);
  });
}

function renderOverview(root, { profiles, properties, inquiries, stats }) {
  const statCards = [
    statCard('Потребители', stats.users.total),
    statCard('Администратори', stats.users.admins),
    statCard('Общо имоти', stats.properties.total),
    statCard('Публикувани обяви', stats.properties.byStatus.get('active') ?? 0),
    statCard('Скрити обяви', stats.properties.byStatus.get('archived') ?? 0),
    statCard('Продадени имоти', stats.properties.byStatus.get('sold') ?? 0),
    statCard('Запитвания', stats.inquiries.total),
    statCard('Непрочетени запитвания', stats.inquiries.byStatus.get('unread') ?? 0),
  ];

  root.querySelector('[data-stat-cards]').innerHTML = statCards.join('');

  const transactionBreakdown = root.querySelector('[data-breakdown="transaction"]');
  transactionBreakdown.innerHTML =
    stats.properties.total === 0
      ? emptyState('Няма имоти все още.')
      : [...stats.properties.byTransactionType.entries()]
          .map(([key, count]) => breakdownRow(transactionTypeLabels[key] ?? key, count, stats.properties.total))
          .join('');

  const propertyTypeBreakdown = root.querySelector('[data-breakdown="property-type"]');
  propertyTypeBreakdown.innerHTML =
    stats.properties.total === 0
      ? emptyState('Няма имоти все още.')
      : [...stats.properties.byPropertyType.entries()]
          .map(([key, count]) => breakdownRow(propertyTypeLabels[key] ?? key, count, stats.properties.total))
          .join('');

  const citiesBreakdown = root.querySelector('[data-breakdown="cities"]');
  citiesBreakdown.innerHTML =
    stats.properties.topCities.length === 0
      ? emptyState('Няма данни за градове.')
      : stats.properties.topCities.map(([city, count]) => breakdownRow(city, count, stats.properties.total)).join('');

  const recentUsers = root.querySelector('[data-recent-users]');
  recentUsers.innerHTML =
    profiles.length === 0
      ? emptyState('Няма регистрирани потребители.')
      : profiles
          .slice(0, 5)
          .map(
            (profile) => `
              <div class="flex items-center justify-between gap-3 text-sm">
                <div class="min-w-0">
                  <p class="truncate font-medium text-slate-900">${escapeHtml(fullName(profile))}</p>
                  <p class="truncate text-slate-500">${escapeHtml(profile.email ?? '')}</p>
                </div>
                <span class="shrink-0 text-xs text-slate-400">${escapeHtml(formatDate(profile.created_at))}</span>
              </div>
            `
          )
          .join('');

  const recentProperties = root.querySelector('[data-recent-properties]');
  recentProperties.innerHTML =
    properties.length === 0
      ? emptyState('Няма добавени имоти.')
      : properties
          .slice(0, 5)
          .map(
            (property) => `
              <div class="flex items-center justify-between gap-3 text-sm">
                <div class="min-w-0">
                  <a href="/properties/${escapeHtml(property.id)}" class="block truncate font-medium text-slate-900 hover:text-emerald-700">${escapeHtml(property.title)}</a>
                  <p class="truncate text-slate-500">${escapeHtml(property.city)} · ${formatPrice(property.price, property.currency)}</p>
                </div>
                <span class="shrink-0 text-xs text-slate-400">${escapeHtml(formatDate(property.created_at))}</span>
              </div>
            `
          )
          .join('');

  const inquiriesBreakdown = root.querySelector('[data-breakdown="inquiry-status"]');
  if (inquiriesBreakdown) {
    inquiriesBreakdown.innerHTML =
      stats.inquiries.total === 0
        ? emptyState('Няма запитвания.')
        : [...stats.inquiries.byStatus.entries()]
            .map(([key, count]) => breakdownRow(inquiryStatusLabels[key] ?? key, count, stats.inquiries.total))
            .join('');
  }
}

function renderUsers(root, profiles, propertiesByOwner) {
  const tbody = root.querySelector('[data-users-table-body]');

  if (profiles.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-slate-500">Няма намерени потребители.</td></tr>`;
    return;
  }

  tbody.innerHTML = profiles
    .map(
      (profile) => `
        <tr>
          <td class="py-3 pr-4 font-medium text-slate-900">${escapeHtml(fullName(profile))}</td>
          <td class="py-3 pr-4 text-slate-600">${escapeHtml(profile.email ?? '-')}</td>
          <td class="py-3 pr-4 text-slate-600">${escapeHtml(profile.phone ?? '-')}</td>
          <td class="py-3 pr-4">${roleBadge(profile.role)}</td>
          <td class="py-3 pr-4 text-slate-600">${propertiesByOwner.get(profile.id) ?? 0}</td>
          <td class="py-3 pr-4 text-slate-500">${escapeHtml(formatDate(profile.created_at))}</td>
        </tr>
      `
    )
    .join('');
}

function renderProperties(root, properties) {
  const tbody = root.querySelector('[data-properties-table-body]');

  if (properties.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="py-6 text-center text-slate-500">Няма намерени имоти.</td></tr>`;
    return;
  }

  tbody.innerHTML = properties
    .map((property) => {
      const toggleLabel = property.status === 'active' ? 'Скрий' : 'Публикувай';

      return `
        <tr>
          <td class="py-3 pr-4">
            <a href="/properties/${escapeHtml(property.id)}" class="font-medium text-slate-900 hover:text-emerald-700">${escapeHtml(property.title)}</a>
          </td>
          <td class="py-3 pr-4 text-slate-600">${escapeHtml(fullName(property.owner))}</td>
          <td class="py-3 pr-4 text-slate-600">${escapeHtml(transactionTypeLabels[property.transaction_type] ?? property.transaction_type)} · ${escapeHtml(propertyTypeLabels[property.property_type] ?? property.property_type)}</td>
          <td class="py-3 pr-4 text-slate-600">${formatPrice(property.price, property.currency)}</td>
          <td class="py-3 pr-4 text-slate-600">${escapeHtml(property.city)}</td>
          <td class="py-3 pr-4">${statusBadge(property.status)}</td>
          <td class="py-3 pr-4 text-slate-500">${escapeHtml(formatDate(property.created_at))}</td>
          <td class="py-3 pr-4">
            <div class="flex flex-wrap gap-2">
              <button type="button" data-action="toggle" data-id="${escapeHtml(property.id)}" data-status="${escapeHtml(property.status)}" class="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900">
                ${toggleLabel}
              </button>
              <button type="button" data-action="delete" data-id="${escapeHtml(property.id)}" data-title="${escapeHtml(property.title)}" class="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:border-rose-500 hover:text-rose-700">
                Изтрий
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
}

function renderInquiries(root, inquiries) {
  const tbody = root.querySelector('[data-inquiries-table-body]');

  if (inquiries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-500">Няма запитвания.</td></tr>`;
    return;
  }

  tbody.innerHTML = inquiries
    .map((inquiry) => {
      const message = inquiry.message ?? '';
      const truncated = message.length > 90 ? `${message.slice(0, 90)}…` : message;

      return `
        <tr>
          <td class="py-3 pr-4 font-medium text-slate-900">${escapeHtml(inquiry.property?.title ?? 'Изтрит имот')}</td>
          <td class="py-3 pr-4 text-slate-600">
            <p>${escapeHtml(inquiry.sender_name)}</p>
            <p class="text-xs text-slate-400">${escapeHtml(inquiry.sender_email)} · ${escapeHtml(inquiry.sender_phone)}</p>
          </td>
          <td class="py-3 pr-4 text-slate-600">${escapeHtml(truncated)}</td>
          <td class="py-3 pr-4">${inquiryStatusBadge(inquiry.status)}</td>
          <td class="py-3 pr-4 text-slate-500">${escapeHtml(formatDate(inquiry.created_at))}</td>
        </tr>
      `;
    })
    .join('');
}

function showError(root, message) {
  const errorSlot = root.querySelector('[data-admin-error]');

  if (!message) {
    errorSlot.classList.add('hidden');
    errorSlot.textContent = '';
    return;
  }

  errorSlot.textContent = message;
  errorSlot.classList.remove('hidden');
}

export function hydrate(root, params, { authState }) {
  if (!authState?.isAdmin) {
    return;
  }

  let profiles = [];
  let properties = [];
  let inquiries = [];

  const propertiesMessage = root.querySelector('[data-properties-message]');

  const setPropertiesMessage = (message) => {
    if (!propertiesMessage) {
      return;
    }

    propertiesMessage.classList.toggle('hidden', !message);
    propertiesMessage.textContent = message ?? '';
  };

  function applyUsersFilter() {
    const query = root.querySelector('[data-users-search]').value.trim().toLowerCase();
    const propertiesByOwner = buildAdminStats({ profiles, properties, inquiries }).properties.byOwner;

    const filtered = !query
      ? profiles
      : profiles.filter((profile) => `${fullName(profile)} ${profile.email ?? ''}`.toLowerCase().includes(query));

    renderUsers(root, filtered, propertiesByOwner);
  }

  function applyPropertiesFilter() {
    const query = root.querySelector('[data-properties-search]').value.trim().toLowerCase();
    const status = root.querySelector('[data-properties-status-filter]').value;

    const filtered = properties.filter((property) => {
      if (status && property.status !== status) return false;
      if (query && !`${property.title} ${property.city}`.toLowerCase().includes(query)) return false;
      return true;
    });

    renderProperties(root, filtered);
  }

  function applyInquiriesFilter() {
    const status = root.querySelector('[data-inquiries-status-filter]').value;
    const filtered = status ? inquiries.filter((inquiry) => inquiry.status === status) : inquiries;
    renderInquiries(root, filtered);
  }

  async function loadAll() {
    showError(root, '');

    const [profilesResult, propertiesResult, inquiriesResult] = await Promise.all([
      fetchAllProfiles(),
      fetchAllPropertiesForAdmin(),
      fetchAllInquiries(),
    ]);

    if (profilesResult.error || propertiesResult.error || inquiriesResult.error) {
      showError(root, 'Част от данните не можаха да бъдат заредени. Опитайте отново по-късно.');
    }

    profiles = profilesResult.data;
    properties = propertiesResult.data;
    inquiries = inquiriesResult.data;

    const stats = buildAdminStats({ profiles, properties, inquiries });

    renderOverview(root, { profiles, properties, inquiries, stats });
    applyUsersFilter();
    applyPropertiesFilter();
    applyInquiriesFilter();
  }

  async function reloadProperties() {
    const { data, error } = await fetchAllPropertiesForAdmin();

    if (error) {
      setPropertiesMessage('Списъкът с имоти не можа да бъде обновен.');
      return;
    }

    properties = data;
    const stats = buildAdminStats({ profiles, properties, inquiries });
    renderOverview(root, { profiles, properties, inquiries, stats });
    applyPropertiesFilter();
  }

  root.querySelectorAll('[data-tab-button]').forEach((button) => {
    button.addEventListener('click', () => setActiveTab(root, button.dataset.tabButton));
  });

  setActiveTab(root, 'overview');

  root.querySelector('[data-users-search]').addEventListener('input', applyUsersFilter);
  root.querySelector('[data-properties-search]').addEventListener('input', applyPropertiesFilter);
  root.querySelector('[data-properties-status-filter]').addEventListener('change', applyPropertiesFilter);
  root.querySelector('[data-inquiries-status-filter]').addEventListener('change', applyInquiriesFilter);

  root.querySelector('[data-properties-table-body]').addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');

    if (!button || button.disabled) {
      return;
    }

    const { action, id } = button.dataset;

    if (!isUuid(id)) {
      return;
    }

    setPropertiesMessage('');

    if (action === 'toggle') {
      const nextStatus = button.dataset.status === 'active' ? 'archived' : 'active';
      button.disabled = true;

      const { error } = await setPropertyStatus(id, nextStatus);

      if (error) {
        button.disabled = false;
        setPropertiesMessage(error.message || 'Статусът на обявата не можа да бъде обновен.');
        return;
      }

      await reloadProperties();
      return;
    }

    if (action === 'delete') {
      const title = button.dataset.title || 'тази обява';

      if (!window.confirm(`Да се изтрие ли "${title}" завинаги? Това действие не може да бъде отменено.`)) {
        return;
      }

      button.disabled = true;

      const { error } = await deleteProperty(id);

      if (error) {
        button.disabled = false;
        setPropertiesMessage(error.message || 'Обявата не можа да бъде изтрита.');
        return;
      }

      await reloadProperties();
    }
  });

  void loadAll();
}
