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
      card.className = 'card content-card';

      const header = document.createElement('div');
      header.className = 'card-header';

      const title = document.createElement('div');
      title.textContent = item.title;
      title.className = 'knowledge-title';

      const actions = document.createElement('div');
      actions.className = 'card-actions';

      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'secondary small';
      editButton.textContent = item.isEditing ? 'Done' : 'Edit';
      editButton.addEventListener('click', () => {
        item.isEditing = !item.isEditing;
        renderKnowledgeItems();
      });

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'secondary small';
      deleteButton.textContent = 'Delete';
      deleteButton.addEventListener('click', () => {
        data.knowledgeItems = data.knowledgeItems.filter(
          (entry) => entry.id !== item.id
        );
        renderKnowledgeItems();
        refreshPreview();
      });

      actions.append(editButton, deleteButton);
      header.append(title, actions);

      const body = document.createElement('div');
      body.className = 'knowledge-body';

      if (item.isEditing) {
        const grid = document.createElement('div');
        grid.className = 'edit-grid';

        const titleField = createLabeledInput('Title', item.title, (value) => {
          item.title = value;
          title.textContent = value;
          refreshPreview();
        });

        const categoryField = createSelect(
          'Category',
          item.category,
          ['Policies', 'Benefits', 'Procedures', 'Documents'],
          (value) => {
            item.category = value;
            refreshPreview();
          }
        );

        const contentField = createLabeledTextarea(
          'Content',
          item.content,
          (value) => {
            item.content = value;
            refreshPreview();
          }
        );

        grid.append(titleField, categoryField, contentField);
        body.appendChild(grid);
      } else {
        const category = document.createElement('div');
        category.className = 'knowledge-meta';
        category.textContent = item.category;

        const content = document.createElement('p');
        content.className = 'knowledge-content';
        content.textContent = item.content;

        body.append(category, content);
      }

      card.append(header, body);
      list.appendChild(card);
    });
  }

  function createLabeledInput(labelText, value, onChange) {
    const wrapper = document.createElement('div');
    const label = document.createElement('label');
    label.textContent = labelText;
    label.className = 'sr-only';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.placeholder = labelText;
    input.setAttribute('aria-label', labelText);
    input.addEventListener('input', (event) => onChange(event.target.value));
    wrapper.append(label, input);
    return wrapper;
  }

  function createSelect(labelText, value, options, onChange) {
    const wrapper = document.createElement('div');
    const label = document.createElement('label');
    label.textContent = labelText;
    label.className = 'sr-only';
    const select = document.createElement('select');
    select.setAttribute('aria-label', labelText);
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
    label.className = 'sr-only';
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.placeholder = labelText;
    textarea.setAttribute('aria-label', labelText);
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
    refreshPreview();
  }

  window.addEventListener('DOMContentLoaded', init);
})();
