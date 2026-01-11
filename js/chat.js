(function () {
  const defaultWelcome =
    'You can ask questions about internal policies, benefits or HR procedures.';

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
      .map((part) => part.replace(/[^a-zA-Z]/g, '').toLowerCase())
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
    header.textContent = 'Helpin Assistant';

    const body = document.createElement('div');
    body.className = 'chat-body';

    const inputRow = document.createElement('div');
    inputRow.className = 'chat-input';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Ask a question';

    const sendButton = document.createElement('button');
    sendButton.type = 'button';
    sendButton.className = 'primary';
    sendButton.textContent = 'Send';

    inputRow.append(input, sendButton);
    shell.append(header, body, inputRow);
    container.appendChild(shell);

    body.appendChild(createMessage(defaultWelcome, 'assistant', false));
    if (mode === 'preview') {
      body.appendChild(createMessage('What is the PTO policy?', 'user', false));
      body.appendChild(
        createMessage(
          {
            title: 'Paid time off eligibility',
            body:
              'Benefits · Full-time employees accrue 1.5 days of paid time off per month.'
          },
          'assistant',
          true
        )
      );
      body.appendChild(
        createMessage(
          'Can I work remotely two days a week?',
          'user',
          false
        )
      );
      body.appendChild(
        createMessage(
          {
            title: 'Remote work guidelines',
            body:
              'Policies · Remote work is available up to two days per week with manager approval.'
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
      input.placeholder = 'Preview only';
    }
  }

  window.HelpinChat = { initChat };
})();
