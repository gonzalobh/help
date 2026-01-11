(function () {
  const data = window.HelpinData;
  const systemPromptDefault = data.systemPrompt;
  const knowledgeDrafts = new Map();

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

      if (item.isEditing) {
        const saveButton = document.createElement('button');
        saveButton.type = 'button';
        saveButton.className = 'secondary small';
        saveButton.textContent = 'Save';
        saveButton.addEventListener('click', () => {
          const draft = knowledgeDrafts.get(item.id);
          if (draft) {
            item.title = draft.title;
            item.category = draft.category;
            item.content = draft.content;
          }
          item.isEditing = false;
          knowledgeDrafts.delete(item.id);
          renderKnowledgeItems();
          refreshPreview();
        });

        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'secondary small';
        cancelButton.textContent = 'Cancel';
        cancelButton.addEventListener('click', () => {
          item.isEditing = false;
          knowledgeDrafts.delete(item.id);
          renderKnowledgeItems();
        });

        actions.append(saveButton, cancelButton);
      } else {
        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.className = 'secondary small';
        editButton.textContent = 'Edit';
        editButton.addEventListener('click', () => {
          knowledgeDrafts.set(item.id, {
            title: item.title,
            category: item.category,
            content: item.content
          });
          item.isEditing = true;
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
          knowledgeDrafts.delete(item.id);
          renderKnowledgeItems();
          refreshPreview();
        });

        actions.append(editButton, deleteButton);
      }
      header.append(title, actions);

      const body = document.createElement('div');
      body.className = 'knowledge-body';

      if (item.isEditing) {
        const grid = document.createElement('div');
        grid.className = 'edit-grid';
        const draft = knowledgeDrafts.get(item.id) || {
          title: item.title,
          category: item.category,
          content: item.content
        };

        const titleField = createLabeledInput('Title', draft.title, (value) => {
          const nextDraft = knowledgeDrafts.get(item.id);
          if (nextDraft) {
            nextDraft.title = value;
          }
        });

        const categoryField = createSelect(
          'Category',
          draft.category,
          ['Policies', 'Benefits', 'Procedures', 'Documents'],
          (value) => {
            const nextDraft = knowledgeDrafts.get(item.id);
            if (nextDraft) {
              nextDraft.category = value;
            }
          }
        );

        const contentField = createLabeledTextarea(
          'Content',
          draft.content,
          (value) => {
            const nextDraft = knowledgeDrafts.get(item.id);
            if (nextDraft) {
              nextDraft.content = value;
            }
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

  function initTabs() {
    const buttons = Array.from(document.querySelectorAll('.tab-button'));
    const panels = Array.from(document.querySelectorAll('.tab-panel'));

    if (!buttons.length || !panels.length) {
      return;
    }

    function setActiveTab(target) {
      buttons.forEach((button) => {
        button.classList.toggle(
          'active',
          button.dataset.tabTarget === target
        );
      });
      panels.forEach((panel) => {
        panel.classList.toggle('active', panel.dataset.tabPanel === target);
      });
    }

    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        setActiveTab(button.dataset.tabTarget);
      });
    });
  }

  function renderSettings() {
    const settings = data.settings;
    if (!settings) {
      return;
    }

    const hrEmailInput = document.querySelector('#hrEmail');
    const hrUrlInput = document.querySelector('#hrUrl');
    const hrFallbackTextarea = document.querySelector('#hrFallback');

    if (hrEmailInput) {
      hrEmailInput.value = settings.hrContact.email;
      hrEmailInput.addEventListener('input', (event) => {
        settings.hrContact.email = event.target.value;
      });
    }

    if (hrUrlInput) {
      hrUrlInput.value = settings.hrContact.url;
      hrUrlInput.addEventListener('input', (event) => {
        settings.hrContact.url = event.target.value;
      });
    }

    if (hrFallbackTextarea) {
      hrFallbackTextarea.value = settings.hrContact.fallbackMessage;
      hrFallbackTextarea.addEventListener('input', (event) => {
        settings.hrContact.fallbackMessage = event.target.value;
        data.sampleResponses.fallback = event.target.value;
      });
    }

    const boundaries = settings.assistantBoundaries;
    const boundaryPersonal = document.querySelector('#boundaryPersonal');
    const boundaryContracts = document.querySelector('#boundaryContracts');
    const boundaryLegal = document.querySelector('#boundaryLegal');
    const boundaryEscalate = document.querySelector('#boundaryEscalate');

    if (boundaryPersonal) {
      boundaryPersonal.checked = boundaries.noPersonalCases;
      boundaryPersonal.addEventListener('change', (event) => {
        boundaries.noPersonalCases = event.target.checked;
      });
    }

    if (boundaryContracts) {
      boundaryContracts.checked = boundaries.noContractInterpretation;
      boundaryContracts.addEventListener('change', (event) => {
        boundaries.noContractInterpretation = event.target.checked;
      });
    }

    if (boundaryLegal) {
      boundaryLegal.checked = boundaries.noLegalQuestions;
      boundaryLegal.addEventListener('change', (event) => {
        boundaries.noLegalQuestions = event.target.checked;
      });
    }

    if (boundaryEscalate) {
      boundaryEscalate.checked = boundaries.alwaysEscalate;
      boundaryEscalate.addEventListener('change', (event) => {
        boundaries.alwaysEscalate = event.target.checked;
      });
    }

    const toneOptions = Array.from(
      document.querySelectorAll('input[name="tone"]')
    );
    toneOptions.forEach((option) => {
      option.checked = option.value === settings.tone;
      option.addEventListener('change', (event) => {
        if (event.target.checked) {
          settings.tone = event.target.value;
        }
      });
    });

    const languageSelect = document.querySelector('#assistantLanguage');
    if (languageSelect) {
      languageSelect.value = settings.language;
      languageSelect.addEventListener('change', (event) => {
        settings.language = event.target.value;
      });
    }

    const disclaimerTextarea = document.querySelector('#assistantDisclaimer');
    const resetDisclaimer = document.querySelector('#resetDisclaimer');
    const disclaimerDefault = settings.disclaimer;

    if (disclaimerTextarea) {
      disclaimerTextarea.value = settings.disclaimer;
      disclaimerTextarea.addEventListener('input', (event) => {
        settings.disclaimer = event.target.value;
      });
    }

    if (resetDisclaimer && disclaimerTextarea) {
      resetDisclaimer.addEventListener('click', () => {
        settings.disclaimer = disclaimerDefault;
        disclaimerTextarea.value = disclaimerDefault;
      });
    }
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
    initTabs();
    renderSystemPrompt();
    renderKnowledgeItems();
    renderKnowledgeActions();
    renderSettings();
    refreshPreview();
  }

  window.addEventListener('DOMContentLoaded', init);
})();
