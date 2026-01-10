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

  function renderTopics(topics, container, onSelect) {
    container.innerHTML = '';
    const visibleTopics = topics.filter((topic) => topic.visible);
    if (visibleTopics.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'note';
      empty.textContent = 'No topics are currently available.';
      container.appendChild(empty);
      return;
    }

    visibleTopics.forEach((topic) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'topic-button';
      button.textContent = `${topic.icon ? `${topic.icon} ` : ''}${topic.title}`;
      button.addEventListener('click', () => onSelect(topic.prompt));
      container.appendChild(button);
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

    const topics = document.createElement('div');
    topics.className = 'chat-topics';

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
    shell.append(header, body, topics, inputRow);
    container.appendChild(shell);

    body.appendChild(createMessage(defaultWelcome, 'assistant', false));

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

    renderTopics(data.chatTopics, topics, (prompt) => sendMessage(prompt));

    sendButton.addEventListener('click', () => sendMessage(input.value));
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        sendMessage(input.value);
      }
    });
  }

  window.HelpinChat = { initChat };
})();
