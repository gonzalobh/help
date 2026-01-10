(function () {
  const data = window.HelpinData;
  const systemPromptDefault = data.systemPrompt;

  function createId(prefix) {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  function renderSystemPrompt() {
    const textarea = document.querySelector('#systemPrompt');
    const resetButton = document.querySelector('#resetPrompt');

    textarea.value = data.systemPrompt;

    textarea.addEventListener('input', (event) => {
      data.systemPrompt = event.target.value;
    });

    resetButton.addEventListener('click', () => {
      data.systemPrompt = systemPromptDefault;
      textarea.value = systemPromptDefault;
    });
  }

  function renderKnowledgeItems() {
    const list = document.querySelector('#knowledgeList');
    list.innerHTML = '';

    data.knowledgeItems.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'card';

      const header = document.createElement('div');
      header.className = 'card-header';

      const title = document.createElement('div');
      title.textContent = 'Knowledge item';
      title.className = 'helper-text';

      const actions = document.createElement('div');
      actions.className = 'card-actions';

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'secondary';
      deleteButton.textContent = 'Delete';
      deleteButton.addEventListener('click', () => {
        data.knowledgeItems = data.knowledgeItems.filter(
          (entry) => entry.id !== item.id
        );
        renderKnowledgeItems();
      });

      actions.appendChild(deleteButton);
      header.append(title, actions);

      const grid = document.createElement('div');
      grid.className = 'form-grid';

      const titleField = createLabeledInput('Title', item.title, (value) => {
        item.title = value;
      });

      const categoryField = createSelect('Category', item.category, [
        'Policies',
        'Benefits',
        'Procedures',
        'Documents'
      ], (value) => {
        item.category = value;
      });

      const contentField = createLabeledTextarea(
        'Content',
        item.content,
        (value) => {
          item.content = value;
        }
      );

      grid.append(titleField, categoryField, contentField);
      card.append(header, grid);
      list.appendChild(card);
    });
  }

  function createLabeledInput(labelText, value, onChange) {
    const wrapper = document.createElement('div');
    const label = document.createElement('label');
    label.textContent = labelText;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.addEventListener('input', (event) => onChange(event.target.value));
    wrapper.append(label, input);
    return wrapper;
  }

  function createSelect(labelText, value, options, onChange) {
    const wrapper = document.createElement('div');
    const label = document.createElement('label');
    label.textContent = labelText;
    const select = document.createElement('select');
    options.forEach((optionValue) => {
      const option = document.createElement('option');
      option.value = optionValue;
      option.textContent = optionValue;
      if (optionValue === value) {
        option.selected = true;
      }
      select.appendChild(option);
    });
    select.addEventListener('change', (event) => onChange(event.target.value));
    wrapper.append(label, select);
    return wrapper;
  }

  function createLabeledTextarea(labelText, value, onChange) {
    const wrapper = document.createElement('div');
    const label = document.createElement('label');
    label.textContent = labelText;
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.addEventListener('input', (event) => onChange(event.target.value));
    wrapper.append(label, textarea);
    return wrapper;
  }

  function renderKnowledgeActions() {
    const addButton = document.querySelector('#addKnowledge');
    addButton.addEventListener('click', () => {
      data.knowledgeItems.push({
        id: createId('know'),
        title: 'New knowledge title',
        category: 'Policies',
        content: 'Describe the policy, benefit, or procedure here.'
      });
      renderKnowledgeItems();
    });
  }

  function renderTopics() {
    const list = document.querySelector('#topicsList');
    list.innerHTML = '';

    data.chatTopics.forEach((topic, index) => {
      const card = document.createElement('div');
      card.className = 'card';

      const header = document.createElement('div');
      header.className = 'card-header';

      const label = document.createElement('div');
      label.className = 'helper-text';
      label.textContent = `Topic ${index + 1}`;

      const actions = document.createElement('div');
      actions.className = 'card-actions';

      const upButton = document.createElement('button');
      upButton.type = 'button';
      upButton.className = 'icon';
      upButton.textContent = 'Up';
      upButton.disabled = index === 0;
      upButton.addEventListener('click', () => {
        reorderTopic(index, index - 1);
      });

      const downButton = document.createElement('button');
      downButton.type = 'button';
      downButton.className = 'icon';
      downButton.textContent = 'Down';
      downButton.disabled = index === data.chatTopics.length - 1;
      downButton.addEventListener('click', () => {
        reorderTopic(index, index + 1);
      });

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'secondary';
      deleteButton.textContent = 'Delete';
      deleteButton.addEventListener('click', () => {
        data.chatTopics = data.chatTopics.filter((item) => item.id !== topic.id);
        renderTopics();
        refreshPreview();
      });

      actions.append(upButton, downButton, deleteButton);
      header.append(label, actions);

      const grid = document.createElement('div');
      grid.className = 'form-grid';

      const row = document.createElement('div');
      row.className = 'topic-row';

      const iconField = createLabeledInput('Icon', topic.icon, (value) => {
        topic.icon = value;
        refreshPreview();
      });

      const titleField = createLabeledInput('Title', topic.title, (value) => {
        topic.title = value;
        refreshPreview();
      });

      const promptField = createLabeledTextarea(
        'Internal prompt',
        topic.prompt,
        (value) => {
          topic.prompt = value;
        }
      );

      row.append(iconField, titleField);
      grid.append(row, promptField);

      const toggleRow = document.createElement('div');
      toggleRow.className = 'toggle';
      const toggle = document.createElement('input');
      toggle.type = 'checkbox';
      toggle.checked = topic.visible;
      toggle.addEventListener('change', (event) => {
        topic.visible = event.target.checked;
        refreshPreview();
      });
      const toggleLabel = document.createElement('span');
      toggleLabel.textContent = 'Visible to employees';
      toggleRow.append(toggle, toggleLabel);

      card.append(header, grid, toggleRow);
      list.appendChild(card);
    });
  }

  function reorderTopic(fromIndex, toIndex) {
    if (toIndex < 0 || toIndex >= data.chatTopics.length) {
      return;
    }
    const [moved] = data.chatTopics.splice(fromIndex, 1);
    data.chatTopics.splice(toIndex, 0, moved);
    renderTopics();
    refreshPreview();
  }

  function renderTopicActions() {
    const addButton = document.querySelector('#addTopic');
    addButton.addEventListener('click', () => {
      data.chatTopics.push({
        id: createId('topic'),
        icon: '❔',
        title: 'New topic',
        prompt: 'Describe the question employees will ask.',
        visible: true
      });
      renderTopics();
      refreshPreview();
    });
  }

  function refreshPreview() {
    const previewContainer = document.querySelector('#previewChat');
    if (window.HelpinChat && previewContainer) {
      window.HelpinChat.initChat({
        container: previewContainer,
        data,
        mode: 'preview'
      });
    }
  }

  function init() {
    renderSystemPrompt();
    renderKnowledgeItems();
    renderKnowledgeActions();
    renderTopics();
    renderTopicActions();
    refreshPreview();
  }

  window.addEventListener('DOMContentLoaded', init);
})();
