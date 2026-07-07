import './profile.scss';
import template from './profile.html?raw';
import { updateEmail, updatePassword, updateProfile } from '../../lib/auth.js';
import { refreshUnreadBadge } from '../../components/header/header.js';
import {
  escapeHtml,
  formatDateTime,
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
import {
  fetchConversations,
  lastMessage,
  markConversationRead,
  otherParticipant,
  sendReply,
  sortedMessages,
  unreadCountFor,
} from '../../lib/messages.js';

export function render() {
  return template;
}

function setMessage(root, selector, message, tone = 'error') {
  const messageSlot = root.querySelector(selector);

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

  messageSlot.className = `mt-3 whitespace-pre-line rounded-5 px-3 py-6 fs-sm ${tones[tone] ?? tones.error}`;
  messageSlot.textContent = message;
}

function setActiveTab(root, tab) {
  root.querySelectorAll('[data-tab-button]').forEach((button) => {
    const isActive = button.dataset.tabButton === tab;
    button.classList.toggle('bg-emerald-50', isActive);
    button.classList.toggle('text-emerald-700', isActive);
    button.classList.toggle('text-slate-600', !isActive);
  });

  root.querySelectorAll('[data-tab-panel]').forEach((panel) => {
    panel.classList.toggle('d-none', panel.dataset.tabPanel !== tab);
  });
}

function participantName(person) {
  const name = [person?.first_name, person?.last_name].filter(Boolean).join(' ').trim();
  return name || person?.email || 'Потребител';
}

function statusBadge(status) {
  const styles = {
    active: 'bg-emerald-50 text-emerald-700',
    archived: 'bg-amber-100 text-amber-800',
    sold: 'bg-slate-200 text-slate-700',
  };

  return `
    <span class="rounded-pill px-6 py-1 fs-xs fw-semibold text-uppercase tracking-wide ${styles[status] ?? 'bg-slate-100 text-slate-600'}">
      ${escapeHtml(statusLabels[status] ?? status)}
    </span>
  `;
}

function listingRow(property) {
  const photoUrl = sanitizeUrl(coverPhotoUrl(property));
  const thumb = photoUrl
    ? `<img src="${escapeHtml(photoUrl)}" alt="${escapeHtml(property.title)}" class="h-20 w-28 flex-grow-0 flex-shrink-0 rounded-5 object-fit-cover" loading="lazy" />`
    : '<div class="d-flex h-20 w-28 flex-grow-0 flex-shrink-0 align-items-center justify-content-center rounded-5 bg-slate-100 fs-xs fw-medium text-slate-400">Няма снимка</div>';

  const toggleLabel = property.status === 'active' ? 'Скрий' : 'Публикувай';

  return `
    <article class="d-flex flex-wrap align-items-center gap-3 rounded-3xl bg-white p-7 shadow-sm ring-1 ring-slate-200">
      ${thumb}
      <div class="min-w-0 flex-fill">
        <div class="d-flex flex-wrap align-items-center gap-2">
          ${statusBadge(property.status)}
          <span class="fs-xs fw-semibold text-uppercase tracking-wide text-slate-500">
            ${escapeHtml(transactionTypeLabels[property.transaction_type] ?? property.transaction_type)} ·
            ${escapeHtml(propertyTypeLabels[property.property_type] ?? property.property_type)}
          </span>
        </div>
        <a class="mt-2 d-block text-truncate fs-6 fw-semibold text-slate-900 transition hover-text-emerald-700" href="/properties/${escapeHtml(property.id)}">
          ${escapeHtml(property.title)}
        </a>
        <p class="mt-1 fs-sm text-slate-500">${escapeHtml([property.city, property.neighborhood].filter(Boolean).join(', '))} · ${formatPrice(property.price, property.currency)}</p>
      </div>
      <div class="d-flex flex-wrap align-items-center gap-2">
        <a class="rounded-pill border border-slate-300 px-3 py-2 fs-sm fw-medium text-slate-700 transition hover-border-slate-900 hover-text-slate-900" href="/properties/${escapeHtml(property.id)}/edit">Редакция</a>
        <button type="button" data-action="toggle" data-id="${escapeHtml(property.id)}" data-status="${escapeHtml(property.status)}" class="rounded-pill border border-slate-300 px-3 py-2 fs-sm fw-medium text-slate-700 transition hover-border-slate-900 hover-text-slate-900">
          ${toggleLabel}
        </button>
        <button type="button" data-action="delete" data-id="${escapeHtml(property.id)}" data-title="${escapeHtml(property.title)}" class="rounded-pill border border-rose-200 px-3 py-2 fs-sm fw-medium text-rose-600 transition hover-border-rose-500 hover-text-rose-700">
          Изтрий
        </button>
      </div>
    </article>
  `;
}

export function hydrate(root, params, { authState }) {
  if (!authState?.user) {
    return;
  }

  root.querySelectorAll('[data-tab-button]').forEach((button) => {
    button.addEventListener('click', () => setActiveTab(root, button.dataset.tabButton));
  });

  const requestedTab = new URLSearchParams(window.location.search).get('tab');
  setActiveTab(root, ['properties', 'messages', 'account'].includes(requestedTab) ? requestedTab : 'properties');

  const conversationsList = root.querySelector('[data-conversations-list]');
  const conversationThread = root.querySelector('[data-conversation-thread]');
  const messagesTabBadge = root.querySelector('[data-messages-tab-badge]');

  if (conversationsList && conversationThread) {
    const userId = authState.user.id;
    let conversations = [];
    let selectedId = null;

    const updateTabBadge = () => {
      const unread = conversations.reduce((sum, conversation) => sum + unreadCountFor(conversation, userId), 0);

      if (!messagesTabBadge) {
        return;
      }

      if (unread > 0) {
        messagesTabBadge.textContent = unread > 9 ? '9+' : String(unread);
        messagesTabBadge.classList.remove('d-none');
        messagesTabBadge.classList.add('d-flex');
      } else {
        messagesTabBadge.textContent = '';
        messagesTabBadge.classList.add('d-none');
        messagesTabBadge.classList.remove('d-flex');
      }
    };

    const renderConversationsList = () => {
      if (conversations.length === 0) {
        conversationsList.innerHTML = '<p class="p-3 fs-sm text-slate-500">Все още нямате съобщения.</p>';
        return;
      }

      conversationsList.innerHTML = conversations
        .map((conversation) => {
          const other = otherParticipant(conversation, userId);
          const last = lastMessage(conversation);
          const unread = unreadCountFor(conversation, userId);
          const isActive = conversation.id === selectedId;

          return `
            <button
              type="button"
              data-conversation-id="${escapeHtml(conversation.id)}"
              class="list-group-item list-group-item-action d-flex flex-column gap-1 text-start py-6 transition ${isActive ? 'bg-emerald-50' : ''}"
            >
              <div class="d-flex align-items-center justify-content-between gap-2">
                <span class="text-truncate fs-sm fw-semibold text-slate-900">${escapeHtml(participantName(other))}</span>
                ${unread > 0 ? `<span class="d-flex h-5 min-w-5 flex-shrink-0 align-items-center justify-content-center rounded-pill bg-rose-500 px-17 fs-xs fw-bold text-white">${unread > 9 ? '9+' : unread}</span>` : ''}
              </div>
              <p class="text-truncate fs-xs fw-medium text-emerald-700">${escapeHtml(conversation.property?.title ?? 'Изтрит имот')}</p>
              <p class="text-truncate fs-sm text-slate-500">${escapeHtml(last?.body ?? '')}</p>
            </button>
          `;
        })
        .join('');
    };

    const messageBubble = (message) => {
      const isOwn = message.sender_id === userId;

      return `
        <div class="d-flex ${isOwn ? 'justify-content-end' : 'justify-content-start'}">
          <div class="profile-message-bubble rounded-5 px-3 py-18 fs-sm ${isOwn ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-900'}">
            <p class="whitespace-pre-line">${escapeHtml(message.body)}</p>
            <p class="mt-1 profile-message-time ${isOwn ? 'text-slate-300' : 'text-slate-400'}">${escapeHtml(formatDateTime(message.created_at))}</p>
          </div>
        </div>
      `;
    };

    const renderThread = () => {
      const conversation = conversations.find((item) => item.id === selectedId);

      if (!conversation) {
        conversationThread.innerHTML = '<p class="m-auto fs-sm text-slate-500">Изберете разговор от списъка.</p>';
        return;
      }

      const other = otherParticipant(conversation, userId);
      const messages = sortedMessages(conversation);

      conversationThread.innerHTML = `
        <div class="border-bottom border-slate-100 p-3">
          <p class="fw-semibold text-slate-900">${escapeHtml(participantName(other))}</p>
          <a href="/properties/${escapeHtml(conversation.property_id)}" class="fs-sm text-emerald-700 hover-text-emerald-800">${escapeHtml(conversation.property?.title ?? 'Изтрит имот')}</a>
        </div>
        <div data-thread-messages class="flex-fill space-y-3 overflow-y-auto p-3">
          ${messages.map(messageBubble).join('')}
        </div>
        <form data-reply-form class="d-flex align-items-end gap-2 border-top border-slate-100 p-3">
          <textarea name="body" rows="1" maxlength="4000" required placeholder="Напишете съобщение…" class="flex-fill resize-none rounded-5 border border-slate-300 px-3 py-18 fs-sm text-slate-900 outline-none transition profile-reply-textarea"></textarea>
          <button type="submit" class="flex-shrink-0 rounded-pill bg-emerald-600 px-7 py-18 fs-sm fw-semibold text-white transition hover-bg-emerald-500 profile-disabled-btn">Изпрати</button>
        </form>
      `;

      const threadMessages = conversationThread.querySelector('[data-thread-messages]');

      if (threadMessages) {
        threadMessages.scrollTop = threadMessages.scrollHeight;
      }

      conversationThread.querySelector('[data-reply-form]')?.addEventListener('submit', async (event) => {
        event.preventDefault();

        const form = event.currentTarget;
        const body = String(new FormData(form).get('body') ?? '').trim();

        if (!body) {
          return;
        }

        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;

        const { error } = await sendReply({ conversationId: conversation.id, senderId: userId, body });

        submitButton.disabled = false;

        if (error) {
          return;
        }

        form.reset();
        await loadConversations({ keepSelected: true });
      });
    };

    const markSelectedReadIfNeeded = async () => {
      const conversation = conversations.find((item) => item.id === selectedId);

      if (!conversation || unreadCountFor(conversation, userId) === 0) {
        return;
      }

      await markConversationRead(selectedId, userId);

      conversation.messages = conversation.messages.map((message) =>
        message.sender_id !== userId && !message.read_at ? { ...message, read_at: new Date().toISOString() } : message
      );

      renderConversationsList();
      updateTabBadge();
      void refreshUnreadBadge();
    };

    const selectConversation = (id) => {
      selectedId = id;
      renderConversationsList();
      renderThread();
      void markSelectedReadIfNeeded();
    };

    const loadConversations = async ({ keepSelected = false } = {}) => {
      const { data, error } = await fetchConversations(userId);

      if (error) {
        conversationsList.innerHTML = '<p class="p-3 fs-sm text-rose-600">Съобщенията не можаха да бъдат заредени.</p>';
        return;
      }

      conversations = data;

      if (!keepSelected || !conversations.some((item) => item.id === selectedId)) {
        selectedId = conversations[0]?.id ?? null;
      }

      renderConversationsList();
      renderThread();
      updateTabBadge();
      void markSelectedReadIfNeeded();
    };

    conversationsList.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-conversation-id]');

      if (!button) {
        return;
      }

      selectConversation(button.dataset.conversationId);
    });

    void loadConversations();
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
        setMessage(root, '[data-profile-message]', 'Името и фамилията са задължителни.');
        return;
      }

      if (firstName.length > 80 || lastName.length > 80 || phone.length > 30) {
        setMessage(root, '[data-profile-message]', 'Едно от полетата е твърде дълго.');
        return;
      }

      const submitButton = root.querySelector('[data-profile-submit]');
      submitButton.disabled = true;

      const { error } = await updateProfile({ firstName, lastName, phone });

      submitButton.disabled = false;

      if (error) {
        setMessage(root, '[data-profile-message]', error.message || 'Данните не можаха да бъдат обновени.');
        return;
      }

      setMessage(root, '[data-profile-message]', 'Данните ви бяха обновени.', 'success');
    });
  }

  if (emailForm) {
    emailForm.elements.namedItem('email').value = authState.user.email ?? '';

    emailForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      setMessage(root, '[data-email-message]', '');

      const email = String(new FormData(emailForm).get('email') ?? '').trim();

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setMessage(root, '[data-email-message]', 'Въведете валиден имейл адрес.');
        return;
      }

      if (email === authState.user.email) {
        setMessage(root, '[data-email-message]', 'Това вече е вашият имейл адрес.');
        return;
      }

      const submitButton = root.querySelector('[data-email-submit]');
      submitButton.disabled = true;

      const { error } = await updateEmail(email);

      submitButton.disabled = false;

      if (error) {
        setMessage(root, '[data-email-message]', error.message || 'Имейлът не можа да бъде обновен.');
        return;
      }

      setMessage(root, '[data-email-message]', 'Проверете пощата си, за да потвърдите новия имейл адрес.', 'success');
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
        setMessage(root, '[data-password-message]', 'Паролата трябва да е поне 8 символа.');
        return;
      }

      if (password !== confirmPassword) {
        setMessage(root, '[data-password-message]', 'Паролите не съвпадат.');
        return;
      }

      const submitButton = root.querySelector('[data-password-submit]');
      submitButton.disabled = true;

      const { error } = await updatePassword(password);

      submitButton.disabled = false;

      if (error) {
        setMessage(root, '[data-password-message]', error.message || 'Паролата не можа да бъде сменена.');
        return;
      }

      passwordForm.reset();
      setMessage(root, '[data-password-message]', 'Паролата ви беше сменена.', 'success');
    });
  }

  if (!listingsContainer) {
    return;
  }

  const loadListings = async () => {
    const { data, error } = await fetchOwnProperties(authState.user.id);

    if (error) {
      listingsContainer.innerHTML = '<p class="text-rose-600">Вашите обяви не можаха да бъдат заредени. Опитайте отново по-късно.</p>';
      return;
    }

    if (data.length === 0) {
      listingsContainer.innerHTML = '<p class="text-slate-500">Все още нямате обяви. Добавете първия си имот, за да започнете.</p>';
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
        setMessage(root, '[data-listings-message]', error.message || 'Статусът на обявата не можа да бъде обновен.');
        return;
      }

      await loadListings();
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
        setMessage(root, '[data-listings-message]', error.message || 'Обявата не можа да бъде изтрита.');
        return;
      }

      await loadListings();
    }
  });
}
