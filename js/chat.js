(function () {
  const defaultWelcome =
    'Puedes preguntar sobre políticas internas, beneficios o procesos de RR. HH.';
  const premiumWelcome = '¿Qué necesitas hoy?';
  const premiumPlaceholder = 'Ej: ¿Cómo solicito vacaciones?';
  const premiumTyping = 'Pensando';
  const data = window.HelpinData;
  const START_TOPICS_MAX = 12;

  function getDefaultStartTopicsForChat() {
    return {
      enabled: true,
      title: 'Temas frecuentes',
      subtitle: 'Elige un tema o busca una pregunta',
      items: [
        {
          id: 'vacaciones',
          title: 'Vacaciones',
          icon: 'calendar',
          prompt: '¿Cómo solicito vacaciones y cuántos días me corresponden?',
          active: true
        },
        {
          id: 'permisos',
          title: 'Permisos',
          icon: 'clock',
          prompt: '¿Qué permisos existen y cómo se solicitan?',
          active: true
        },
        {
          id: 'licencias',
          title: 'Licencias médicas',
          icon: 'heart',
          prompt: '¿Qué debo hacer si tengo una licencia médica?',
          active: true
        },
        {
          id: 'remuneraciones',
          title: 'Remuneraciones',
          icon: 'wallet',
          prompt: '¿Cuándo se paga el sueldo y dónde veo mi liquidación?',
          active: true
        },
        {
          id: 'beneficios',
          title: 'Beneficios',
          icon: 'gift',
          prompt: '¿Qué beneficios ofrece la empresa y cómo se accede?',
          active: true
        },
        {
          id: 'asistencia',
          title: 'Asistencia y horarios',
          icon: 'clock',
          prompt: '¿Cómo funciona el registro de asistencia y los horarios?',
          active: true
        },
        {
          id: 'certificados',
          title: 'Certificados',
          icon: 'file',
          prompt: '¿Cómo solicito un certificado laboral o de antigüedad?',
          active: true
        },
        {
          id: 'reglamento',
          title: 'Reglamento interno',
          icon: 'book',
          prompt: '¿Dónde consulto el Reglamento Interno y qué puntos clave debo conocer?',
          active: true
        }
      ]
    };
  }

  function normalizeStartTopics(startTopics) {
    const defaults = DEFAULT_START_TOPICS;
    if (!startTopics || typeof startTopics !== 'object') {
      return {
        ...defaults,
        items: [...defaults.items]
      };
    }
    const normalized = {
      enabled:
        typeof startTopics.enabled === 'boolean'
          ? startTopics.enabled
          : defaults.enabled,
      title:
        typeof startTopics.title === 'string' && startTopics.title.trim()
          ? startTopics.title
          : defaults.title,
      subtitle:
        typeof startTopics.subtitle === 'string' && startTopics.subtitle.trim()
          ? startTopics.subtitle
          : defaults.subtitle,
      items: []
    };
    const rawItems = Array.isArray(startTopics.items)
      ? startTopics.items
      : defaults.items;
    normalized.items = rawItems
      .filter((item) => item && typeof item === 'object')
      .map((item, index) => {
        const fallback = defaults.items[index] || {};
        return {
          id: String(item.id || fallback.id || `topic-${index}`),
          title:
            typeof item.title === 'string'
              ? item.title
              : fallback.title || '',
          icon:
            typeof item.icon === 'string'
              ? item.icon
              : fallback.icon || 'heart',
          prompt:
            typeof item.prompt === 'string'
              ? item.prompt
              : fallback.prompt || '',
          active:
            typeof item.active === 'boolean'
              ? item.active
              : fallback.active ?? true
        };
      })
      .slice(0, START_TOPICS_MAX);
    return normalized;
  }

  const DEFAULT_START_TOPICS = getDefaultStartTopicsForChat();
  const DEFAULT_CONFIG = {
    assistantActive: data?.settings?.assistantActive ?? false,
    knowledge: data?.knowledgeContent ?? '',
    hrEmail: data?.settings?.hrContact?.email ?? '',
    hrFallback: data?.settings?.hrContact?.fallbackMessage ?? '',
    disclaimer: data?.settings?.disclaimer ?? '',
    noInfoMessage:
      data?.settings?.noInfoMessage ?? data?.sampleResponses?.fallback ?? '',
    limits: {
      officialOnly:
        data?.settings?.assistantBoundaries?.onlyOfficialInfo ?? false,
      noPersonal: data?.settings?.assistantBoundaries?.noPersonalCases ?? false,
      noContracts:
        data?.settings?.assistantBoundaries?.noContractInterpretation ?? false,
      noLegal: data?.settings?.assistantBoundaries?.noLegalQuestions ?? false,
      escalate: data?.settings?.assistantBoundaries?.alwaysEscalate ?? false
    },
    startTopics: normalizeStartTopics(data?.settings?.startTopics),
    updatedAt: 0
  };

  function logError(message, error) {
    console.error(`[Helpin] ${message}`, error);
  }

  function mergeConfig(remoteConfig) {
    const config = remoteConfig || {};
    return {
      ...DEFAULT_CONFIG,
      ...config,
      limits: {
        ...DEFAULT_CONFIG.limits,
        ...(config.limits || {})
      },
      startTopics: normalizeStartTopics(config.startTopics)
    };
  }

  function applyConfigToData(config) {
    data.knowledgeContent = config.knowledge || '';
    data.settings = data.settings || {};
    data.sampleResponses = data.sampleResponses || {};
    data.settings.hrContact = data.settings.hrContact || {};
    data.settings.assistantBoundaries = data.settings.assistantBoundaries || {};

    data.settings.assistantActive = Boolean(config.assistantActive);
    data.settings.hrContact.email = config.hrEmail || '';
    data.settings.hrContact.fallbackMessage = config.hrFallback || '';
    data.settings.disclaimer = config.disclaimer || '';
    data.settings.noInfoMessage = config.noInfoMessage || '';
    data.sampleResponses.fallback =
      data.settings.noInfoMessage || data.sampleResponses.fallback || '';

    const limits = config.limits || {};
    data.settings.assistantBoundaries.onlyOfficialInfo = Boolean(
      limits.officialOnly
    );
    data.settings.assistantBoundaries.noPersonalCases = Boolean(
      limits.noPersonal
    );
    data.settings.assistantBoundaries.noContractInterpretation = Boolean(
      limits.noContracts
    );
    data.settings.assistantBoundaries.noLegalQuestions = Boolean(
      limits.noLegal
    );
    data.settings.assistantBoundaries.alwaysEscalate = Boolean(limits.escalate);
    data.settings.startTopics = normalizeStartTopics(config.startTopics);
  }

  async function loadConfigFromFirebase() {
    if (typeof db === 'undefined') {
      return mergeConfig();
    }
    try {
      const snapshot = await db.ref('config').once('value');
      return mergeConfig(snapshot.val());
    } catch (error) {
      logError('No se pudo cargar la configuración.', error);
      return mergeConfig();
    }
  }

  function createMessage(content, role, options = {}) {
    const message = document.createElement('div');
    message.className = `message ${role}`;
    message.textContent = content;
    if (options.isNew) {
      message.classList.add('is-new');
    }
    if (options.isTyping) {
      message.classList.add('typing');
    }
    if (options.className) {
      message.classList.add(options.className);
    }
    return message;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function typeIntoElement(
    el,
    fullText,
    { mode = 'word', minDelay = 12, maxDelay = 28, onUpdate } = {}
  ) {
    const text = fullText || '';
    const tokens =
      mode === 'char'
        ? Array.from(text)
        : text.split(/(\s+)/).filter((token) => token.length > 0);
    let currentText = '';
    for (const token of tokens) {
      currentText += token;
      el.textContent = currentText;
      if (onUpdate) {
        onUpdate();
      }
      if (maxDelay > 0) {
        const delay =
          minDelay + Math.random() * Math.max(0, maxDelay - minDelay);
        await sleep(delay);
      }
    }
    el.textContent = text;
  }

  function getFallbackMessage(data) {
    return (
      data.settings?.noInfoMessage ||
      data.sampleResponses?.fallback ||
      'Para evitar errores, es mejor confirmarlo con RR. HH.'
    );
  }

  function getContextPrefix(data) {
    const country = data.settings?.countryContext;
    if (!country) {
      return '';
    }
    if (country === 'Genérico') {
      return 'Según las políticas internas de la empresa:\n';
    }
    return `Según las políticas internas de la empresa, alineadas con la legislación de ${country}:\n`;
  }

  const ICONS = {
    calendar:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
    clock:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 3"></path></svg>',
    wallet:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 7H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h16V7z"></path><path d="M17 7V5a2 2 0 0 0-2-2H5"></path><circle cx="16.5" cy="12" r="1.5"></circle></svg>',
    heart:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"></path></svg>',
    file:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path></svg>',
    book:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z"></path></svg>',
    users:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0z"></path><path d="M4 21v-1a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v1"></path></svg>'
  };

  function createStartSurface(startTopics, { onSendMessage } = {}) {
    const surface = document.createElement('div');
    surface.className = 'start-surface';

    const head = document.createElement('div');
    head.className = 'start-surface-head';
    const title = document.createElement('div');
    title.className = 'start-title';
    title.textContent = startTopics.title || 'Temas frecuentes';
    const subtitle = document.createElement('div');
    subtitle.className = 'start-subtitle';
    subtitle.textContent =
      startTopics.subtitle || 'Elige un tema o busca una pregunta';
    head.append(title, subtitle);

    const search = document.createElement('div');
    search.className = 'start-search';
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'start-search-input';
    searchInput.placeholder = 'Busca: vacaciones, licencias, beneficios…';
    const searchHint = document.createElement('div');
    searchHint.className = 'start-search-hint';
    search.append(searchInput, searchHint);

    const grid = document.createElement('div');
    grid.className = 'start-grid';

    const emptyState = document.createElement('div');
    emptyState.className = 'start-empty';
    emptyState.textContent =
      'No encuentro ese tema. Presiona Enter para preguntar igual.';
    emptyState.hidden = true;

    const activeItems = (startTopics.items || []).filter((item) => item.active);
    let filteredItems = activeItems.slice();

    const buildIcon = (item) => {
      if (ICONS[item.icon]) {
        return ICONS[item.icon];
      }
      if (item.icon === 'gift' && ICONS.heart) {
        return ICONS.heart;
      }
      const letter = (item.title || '?').trim().charAt(0).toUpperCase() || '?';
      return `<span class="start-card-letter">${letter}</span>`;
    };

    const renderGrid = (items, query = '') => {
      grid.innerHTML = '';
      if (!items.length && query) {
        emptyState.hidden = false;
      } else {
        emptyState.hidden = true;
      }
      items.forEach((item) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'start-card';
        const icon = document.createElement('div');
        icon.className = 'start-card-icon';
        icon.innerHTML = buildIcon(item);
        const cardTitle = document.createElement('div');
        cardTitle.className = 'start-card-title';
        cardTitle.textContent = item.title;
        const prompt = document.createElement('div');
        prompt.className = 'start-card-prompt';
        prompt.textContent = item.prompt;
        card.append(icon, cardTitle, prompt);
        card.addEventListener('click', () => {
          if (typeof onSendMessage === 'function') {
            onSendMessage(item.prompt);
          }
        });
        grid.appendChild(card);
      });
      if (query) {
        searchHint.textContent = `${items.length} tema${
          items.length === 1 ? '' : 's'
        } encontrado${items.length === 1 ? '' : 's'}.`;
      } else {
        searchHint.textContent = '';
      }
    };

    renderGrid(filteredItems);

    searchInput.addEventListener('input', (event) => {
      const query = event.target.value.trim().toLowerCase();
      if (!query) {
        filteredItems = activeItems.slice();
        renderGrid(filteredItems);
        return;
      }
      filteredItems = activeItems.filter((item) => {
        const titleMatch = item.title?.toLowerCase().includes(query);
        const promptMatch = item.prompt?.toLowerCase().includes(query);
        return titleMatch || promptMatch;
      });
      renderGrid(filteredItems, query);
    });

    searchInput.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') {
        return;
      }
      event.preventDefault();
      const query = searchInput.value.trim();
      if (!query) {
        return;
      }
      if (filteredItems.length === 1 && filteredItems[0]?.prompt) {
        if (typeof onSendMessage === 'function') {
          onSendMessage(filteredItems[0].prompt);
        }
        return;
      }
      if (typeof onSendMessage === 'function') {
        onSendMessage(query);
      }
    });

    surface.append(head, search, grid, emptyState);
    return surface;
  }

  async function sendToAIMessage(userMessage, data) {
    const fallbackMessage =
      data.settings?.noInfoMessage || getFallbackMessage(data);

    try {
      const response = await fetch('https://hotel-chat-proxy.vercel.app/api/helpin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userMessage }],
          config: {
            knowledgeContent: data.knowledgeContent,
            noInfoMessage: data.settings.noInfoMessage,
            tone: data.settings.tone,
            boundaries: data.settings.assistantBoundaries,
            hrContact: data.settings.hrContact
          }
        })
      });
      if (!response.ok) {
        throw new Error(`Respuesta inválida: ${response.status}`);
      }
      const result = await response.json();
      return result?.reply || fallbackMessage;
    } catch (error) {
      logError('No se pudo obtener respuesta del asistente.', error);
      return fallbackMessage;
    }
  }

  async function initChat({ container, data, mode }) {
    if (!container || !data) {
      return;
    }

    container.innerHTML = '';
    const isPremium = container.dataset.variant === 'premium';
    const welcomeText = isPremium ? premiumWelcome : defaultWelcome;
    const typingText = isPremium ? premiumTyping : 'Respondiendo…';
    let startSurface = null;
    let hasSentMessage = false;

    const removeStartSurface = () => {
      if (startSurface) {
        startSurface.remove();
        startSurface = null;
      }
    };

    const shell = document.createElement('div');
    shell.className = 'chat-shell';

    const header = document.createElement('div');
    header.className = 'chat-header';
    header.textContent = 'Asistente de Helpin';

    const body = document.createElement('div');
    body.className = 'chat-body';

    const inputRow = document.createElement('div');
    inputRow.className = 'chat-input';

    const input = document.createElement('textarea');
    input.rows = 1;
    input.placeholder = isPremium
      ? premiumPlaceholder
      : 'Escribe tu consulta con el mayor detalle posible.';

    const sendButton = document.createElement('button');
    sendButton.type = 'button';
    sendButton.className = 'primary';
    sendButton.textContent = 'Enviar';

    const status = document.createElement('div');
    status.className = 'chat-status';
    status.textContent = typingText;
    status.hidden = true;

    inputRow.append(input, sendButton, status);
    shell.append(header, body, inputRow);
    container.appendChild(shell);

    const welcomeMessage = createMessage('', 'assistant', { isNew: true });
    body.appendChild(welcomeMessage);
    if (isPremium) {
      typeIntoElement(welcomeMessage, welcomeText, {
        mode: 'word',
        onUpdate: () => scrollToBottom('auto')
      });
    } else {
      welcomeMessage.textContent = welcomeText;
    }

    if (isPremium && mode !== 'preview') {
      const startTopics = data.settings?.startTopics;
      const activeItems = Array.isArray(startTopics?.items)
        ? startTopics.items.filter((item) => item.active)
        : [];
      if (startTopics?.enabled && activeItems.length) {
        startSurface = createStartSurface(startTopics, {
          onSendMessage: (message) => sendMessage(message)
        });
        body.appendChild(startSurface);
      }
    }

    if (mode === 'preview') {
      const previewQuestion =
        '¿Qué debo saber sobre vacaciones, beneficios o políticas internas?';
      body.appendChild(createMessage(previewQuestion, 'user'));
      if (data.knowledgeContent && data.knowledgeContent.trim()) {
        body.appendChild(
          createMessage(
            `${getContextPrefix(data)}${data.knowledgeContent.trim()}`,
            'assistant',
            { isNew: true }
          )
        );
      } else {
        body.appendChild(
          createMessage(
            getFallbackMessage(data),
            'assistant',
            { isNew: true }
          )
        );
      }
    }

    function scrollToBottom(behavior = 'auto') {
      body.scrollTo({
        top: body.scrollHeight,
        behavior
      });
    }

    function adjustTextareaHeight() {
      input.style.height = 'auto';
      const nextHeight = Math.min(input.scrollHeight, 160);
      input.style.height = `${nextHeight}px`;
      input.style.overflowY = input.scrollHeight > 160 ? 'auto' : 'hidden';
    }

    async function sendMessage(message) {
      const trimmed = message.trim();
      if (!trimmed) {
        return;
      }
      if (!hasSentMessage) {
        hasSentMessage = true;
        removeStartSurface();
      }
      body.appendChild(createMessage(trimmed, 'user'));
      const typingIndicator = createMessage(typingText, 'assistant', {
        isTyping: true
      });
      body.appendChild(typingIndicator);
      scrollToBottom();
      input.disabled = true;
      sendButton.disabled = true;
      inputRow.classList.add('is-disabled');
      status.hidden = false;
      input.value = '';
      adjustTextareaHeight();
      if (isPremium) {
        await sleep(350);
      }
      const replyText = await sendToAIMessage(trimmed, data);
      typingIndicator.remove();
      status.hidden = true;
      const responseMessage = createMessage('', 'assistant', { isNew: true });
      body.appendChild(responseMessage);
      await typeIntoElement(responseMessage, replyText, {
        mode: 'word',
        onUpdate: () => scrollToBottom('auto')
      });
      input.disabled = false;
      sendButton.disabled = false;
      inputRow.classList.remove('is-disabled');
      scrollToBottom();
      input.focus();
      if (isPremium && mode !== 'preview') {
        scrollToBottom('smooth');
      }
      if (mode === 'preview') {
        input.focus();
      }
    }

    sendButton.addEventListener('click', () => sendMessage(input.value));
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage(input.value);
      }
    });
    input.addEventListener('input', adjustTextareaHeight);
    adjustTextareaHeight();

    if (mode === 'preview') {
      input.disabled = true;
      sendButton.disabled = true;
      input.placeholder = 'Escriba una consulta';
    }
    scrollToBottom('auto');

    if (mode === 'preview') {
      const footer = document.createElement('div');
      footer.className = 'preview-footer';
      const actions = document.createElement('div');
      actions.className = 'preview-actions';
      const disclaimerText = data.settings?.disclaimer;
      if (actions.children.length) {
        footer.appendChild(actions);
      }
      if (disclaimerText) {
        const disclaimer = document.createElement('div');
        disclaimer.className = 'preview-disclaimer';
        disclaimer.textContent = disclaimerText;
        footer.appendChild(disclaimer);
      }

      if (footer.children.length) {
        container.appendChild(footer);
      }
    }
  }

  function renderInactiveMessage(container) {
    container.innerHTML = '';
    const shell = document.createElement('div');
    shell.className = 'chat-shell';
    const header = document.createElement('div');
    header.className = 'chat-header';
    header.textContent = 'Asistente de Helpin';
    const body = document.createElement('div');
    body.className = 'chat-body';
    body.appendChild(createMessage('El asistente no está activo.', 'assistant'));
    shell.append(header, body);
    container.appendChild(shell);
  }

  async function initWithFirebase({ container, mode }) {
    if (!container) {
      return;
    }
    const config = await loadConfigFromFirebase();
    applyConfigToData(config);
    window.HelpinConfig = config;
    if (!config.assistantActive) {
      renderInactiveMessage(container);
      return;
    }
    initChat({ container, data, mode });
  }

  window.HelpinChat = { initChat, initWithFirebase };
})();
