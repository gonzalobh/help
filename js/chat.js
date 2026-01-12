(function () {
  const defaultWelcome =
    'Usted puede realizar consultas sobre políticas internas, beneficios o procedimientos de RR. HH.';

  function createMessage(content, role) {
    const message = document.createElement('div');
    message.className = `message ${role}`;
    message.textContent = content;
    return message;
  }

  function normalize(text) {
    return text.toLowerCase();
  }

  function extractKeywords(message) {
    const parts = message.split(/\s+/);
    return parts
      .map((part) => part.replace(/[^a-zA-ZÁÉÍÓÚÜÑáéíóúüñ]/g, '').toLowerCase())
      .filter((word) => word.length > 3);
  }

  function hasRelevantKnowledge(message, content) {
    if (!content || !content.trim()) {
      return false;
    }
    const normalizedMessage = normalize(message);
    const normalizedContent = normalize(content);
    if (normalizedContent.includes(normalizedMessage)) {
      return true;
    }
    const keywords = extractKeywords(message);
    return keywords.some((keyword) => normalizedContent.includes(keyword));
  }

  function getFallbackMessage(data) {
    return (
      data.settings?.noInfoMessage ||
      data.sampleResponses?.fallback ||
      'Por favor, contacte a RR. HH. para confirmación.'
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

  function initChat({ container, data, mode }) {
    if (!container || !data) {
      return;
    }

    container.innerHTML = '';

    const shell = document.createElement('div');
    shell.className = 'chat-shell';

    const header = document.createElement('div');
    header.className = 'chat-header';
    header.textContent = 'Asistente de Helpin';

    const body = document.createElement('div');
    body.className = 'chat-body';

    const inputRow = document.createElement('div');
    inputRow.className = 'chat-input';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Escriba una consulta';

    const sendButton = document.createElement('button');
    sendButton.type = 'button';
    sendButton.className = 'primary';
    sendButton.textContent = 'Enviar';

    inputRow.append(input, sendButton);
    shell.append(header, body, inputRow);
    container.appendChild(shell);

    body.appendChild(createMessage(defaultWelcome, 'assistant'));
    if (mode === 'preview') {
      const previewQuestion =
        '¿Qué debo saber sobre vacaciones, beneficios o políticas internas?';
      body.appendChild(createMessage(previewQuestion, 'user'));
      if (data.knowledgeContent && data.knowledgeContent.trim()) {
        body.appendChild(
          createMessage(
            `${getContextPrefix(data)}${data.knowledgeContent.trim()}`,
            'assistant'
          )
        );
      } else {
        body.appendChild(
          createMessage(
            getFallbackMessage(data),
            'assistant'
          )
        );
      }
    }

    function respond(message) {
      const fallbackMessage = getFallbackMessage(data);
      if (!hasRelevantKnowledge(message, data.knowledgeContent || '')) {
        body.appendChild(createMessage(fallbackMessage, 'assistant'));
        return;
      }

      body.appendChild(
        createMessage(
          `${getContextPrefix(data)}${data.knowledgeContent.trim()}`,
          'assistant'
        )
      );
    }

    function sendMessage(message) {
      const trimmed = message.trim();
      if (!trimmed) {
        return;
      }
      body.appendChild(createMessage(trimmed, 'user'));
      respond(trimmed);
      body.scrollTop = body.scrollHeight;
      input.value = '';
      if (mode === 'preview') {
        input.focus();
      }
    }

    sendButton.addEventListener('click', () => sendMessage(input.value));
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        sendMessage(input.value);
      }
    });

    if (mode === 'preview') {
      input.disabled = true;
      sendButton.disabled = true;
      input.placeholder = 'Escriba una consulta';
    }

    if (mode === 'preview') {
      const footer = document.createElement('div');
      footer.className = 'preview-footer';
      const actions = document.createElement('div');
      actions.className = 'preview-actions';
      if (data.settings?.assistantBoundaries?.alwaysEscalate) {
        const hrButton = document.createElement('button');
        hrButton.type = 'button';
        hrButton.className = 'secondary small';
        hrButton.textContent = 'Contactar a RR. HH.';
        actions.appendChild(hrButton);
      }

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

  window.HelpinChat = { initChat };
})();
