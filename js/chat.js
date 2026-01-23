(function () {
  const defaultWelcome =
    'Puedes preguntar sobre políticas internas, beneficios o procesos de RR. HH.';
  const premiumWelcome = '¿Qué necesitas hoy?';
  const premiumPlaceholder = 'Pregunta lo que necesites…';
  const premiumTyping = 'Pensando';
  const data = window.HelpinData;
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
      }
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

    if (isPremium) {
      const quickActions = document.createElement('div');
      quickActions.className = 'quick-actions';
      ['Vacaciones', 'Licencias', 'Beneficios', 'Contrato', 'Pago / sueldo'].forEach(
        (label) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'quick-action';
          button.textContent = label;
          button.addEventListener('click', () => sendMessage(label));
          quickActions.appendChild(button);
        }
      );
      body.appendChild(quickActions);
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
