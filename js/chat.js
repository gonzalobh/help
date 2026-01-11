(function () {
  const defaultWelcome =
    'Puede hacer consultas sobre políticas internas, beneficios o procedimientos de RR. HH.';

  function createMessage(content, role, isStructured) {
    const message = document.createElement('div');
    message.className = `message ${role}`;

    if (isStructured) {
      const title = document.createElement('div');
      title.className = 'message-title';
      title.textContent = content.title;
      const body = document.createElement('div');
      body.textContent = content.body;
      message.append(title, body);
      return message;
    }

    message.textContent = content;
    return message;
  }

  function normalize(text) {
    return text.toLowerCase();
  }

  function extractKeywords(item) {
    const parts = `${item.title} ${item.category}`.split(/\s+/);
    return parts
      .map((part) => part.replace(/[^a-zA-ZÁÉÍÓÚÜÑáéíóúüñ]/g, '').toLowerCase())
      .filter((word) => word.length > 3);
  }

  function findKnowledgeMatch(message, items) {
    const normalized = normalize(message);
    return items.find((item) => {
      const keywords = extractKeywords(item);
      return (
        normalized.includes(normalize(item.title)) ||
        normalized.includes(normalize(item.category)) ||
        keywords.some((keyword) => normalized.includes(keyword)) ||
        normalized.includes(normalize(item.content))
      );
    });
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
    header.textContent = 'Asistente Helpin';

    const body = document.createElement('div');
    body.className = 'chat-body';

    const inputRow = document.createElement('div');
    inputRow.className = 'chat-input';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Haga una consulta';

    const sendButton = document.createElement('button');
    sendButton.type = 'button';
    sendButton.className = 'primary';
    sendButton.textContent = 'Enviar';

    inputRow.append(input, sendButton);
    shell.append(header, body, inputRow);
    container.appendChild(shell);

    body.appendChild(createMessage(defaultWelcome, 'assistant', false));
    if (mode === 'preview') {
      body.appendChild(
        createMessage('¿Cuál es la política de vacaciones pagadas?', 'user', false)
      );
      body.appendChild(
        createMessage(
          {
            title: 'Elegibilidad de vacaciones pagadas',
            body:
              'Beneficios · Los colaboradores con jornada completa acumulan 1,5 días de vacaciones pagadas por mes. Las solicitudes de vacaciones deben enviarse con al menos dos semanas de anticipación.'
          },
          'assistant',
          true
        )
      );
      body.appendChild(
        createMessage(
          '¿Puedo trabajar de forma remota dos días a la semana?',
          'user',
          false
        )
      );
      body.appendChild(
        createMessage(
          {
            title: 'Lineamientos de trabajo remoto',
            body:
              'Políticas · El trabajo remoto está disponible hasta dos días por semana con aprobación de su jefatura. Los colaboradores deben mantener un horario núcleo de 10:00 a 16:00 hora local.'
          },
          'assistant',
          true
        )
      );
    }

    function respond(message) {
      const match = findKnowledgeMatch(message, data.knowledgeItems);
      if (!match) {
        body.appendChild(
          createMessage(data.sampleResponses.fallback, 'assistant', false)
        );
        return;
      }

      body.appendChild(
        createMessage(
          {
            title: match.title,
            body: `${match.category} · ${match.content}`
          },
          'assistant',
          true
        )
      );
    }

    function sendMessage(message) {
      const trimmed = message.trim();
      if (!trimmed) {
        return;
      }
      body.appendChild(createMessage(trimmed, 'user', false));
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
      input.placeholder = 'Haga una consulta';
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
