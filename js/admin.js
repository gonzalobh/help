(function () {
  const data = window.HelpinData;
  const knowledgeDrafts = new Map();
  const knowledgeFilters = {
    search: '',
    category: 'Todas'
  };
  let previewReviewed = false;
  let activeTab = 'dashboard';
  let isDirty = false;
  let saveTimer = null;
  let setActiveTab = () => {};

  function createId(prefix) {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  function updateSaveStatus() {
    const status = document.querySelector('#saveStatus');
    if (!status) {
      return;
    }
    if (isDirty) {
      status.textContent = 'Cambios sin guardar';
      status.classList.add('unsaved');
    } else {
      status.textContent = '✓ Guardado';
      status.classList.remove('unsaved');
    }
  }

  function markDirty() {
    isDirty = true;
    updateSaveStatus();
    if (saveTimer) {
      window.clearTimeout(saveTimer);
    }
    saveTimer = window.setTimeout(() => {
      isDirty = false;
      updateSaveStatus();
    }, 1200);
  }

  function updateTopbar() {
    const chatLink = document.querySelector('#employeeChatLink');
    if (chatLink) {
      chatLink.hidden = activeTab !== 'dashboard';
    }
  }

  function updateChecklist() {
    const checklist = document.querySelector('#setupChecklist');
    if (!checklist) {
      return;
    }
    const steps = checklist.querySelectorAll('.checklist-item');
    const settings = data.settings || {};
    const boundaries = settings.assistantBoundaries || {};
    const boundariesSet = Object.values(boundaries).some(Boolean);

    const completion = {
      knowledge: data.knowledgeItems.length > 0,
      preview: previewReviewed,
      settings: Boolean(settings.hrContact?.email?.trim()) && boundariesSet
    };

    steps.forEach((step) => {
      const key = step.dataset.tabLink;
      step.classList.toggle('completed', Boolean(completion[key]));
    });
  }

  function renderKnowledgeItems() {
    const list = document.querySelector('#knowledgeList');
    list.innerHTML = '';

    const searchTerm = knowledgeFilters.search.trim().toLowerCase();
    const filteredItems = data.knowledgeItems.filter((item) => {
      const matchesCategory =
        knowledgeFilters.category === 'Todas' ||
        item.category === knowledgeFilters.category;
      if (!matchesCategory) {
        return false;
      }
      if (!searchTerm) {
        return true;
      }
      const haystack = `${item.title} ${item.category} ${item.content}`.toLowerCase();
      return haystack.includes(searchTerm);
    });

    filteredItems.forEach((item) => {
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
        saveButton.textContent = 'Guardar';
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
          markDirty();
          updateChecklist();
        });

        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'secondary small';
        cancelButton.textContent = 'Cancelar';
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
        editButton.textContent = 'Editar';
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
        deleteButton.textContent = 'Eliminar';
        deleteButton.addEventListener('click', () => {
          data.knowledgeItems = data.knowledgeItems.filter(
            (entry) => entry.id !== item.id
          );
          knowledgeDrafts.delete(item.id);
          renderKnowledgeItems();
          refreshPreview();
          markDirty();
          updateChecklist();
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

        const titleField = createLabeledInput('Título', draft.title, (value) => {
          const nextDraft = knowledgeDrafts.get(item.id);
          if (nextDraft) {
            nextDraft.title = value;
          }
        });

        const categoryField = createSelect(
          'Categoría',
          draft.category,
          ['Políticas', 'Beneficios', 'Procedimientos', 'Documentos'],
          (value) => {
            const nextDraft = knowledgeDrafts.get(item.id);
            if (nextDraft) {
              nextDraft.category = value;
            }
          }
        );

        const contentField = createLabeledTextarea(
          'Contenido',
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
        title: 'Nuevo título de conocimiento',
        category: 'Políticas',
        content: 'Describa aquí la política, el beneficio o el procedimiento.'
      });
      renderKnowledgeItems();
      refreshPreview();
      markDirty();
      updateChecklist();
    });
  }

  function initKnowledgeFilters() {
    const searchInput = document.querySelector('#knowledgeSearch');
    const filterSelect = document.querySelector('#knowledgeFilter');

    if (searchInput) {
      searchInput.addEventListener('input', (event) => {
        knowledgeFilters.search = event.target.value;
        renderKnowledgeItems();
      });
    }

    if (filterSelect) {
      filterSelect.addEventListener('change', (event) => {
        knowledgeFilters.category = event.target.value;
        renderKnowledgeItems();
      });
    }
  }

  function initTabs() {
    const buttons = Array.from(document.querySelectorAll('.tab-button'));
    const panels = Array.from(document.querySelectorAll('.tab-panel'));

    if (!buttons.length || !panels.length) {
      return;
    }

    setActiveTab = (target) => {
      buttons.forEach((button) => {
        button.classList.toggle(
          'active',
          button.dataset.tabTarget === target
        );
      });
      panels.forEach((panel) => {
        panel.classList.toggle('active', panel.dataset.tabPanel === target);
      });
      activeTab = target;
      if (target === 'preview') {
        previewReviewed = true;
      }
      updateTopbar();
      updateChecklist();
    };

    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        setActiveTab(button.dataset.tabTarget);
      });
    });

    setActiveTab(activeTab);
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
        markDirty();
        updateChecklist();
      });
    }

    if (hrUrlInput) {
      hrUrlInput.value = settings.hrContact.url;
      hrUrlInput.addEventListener('input', (event) => {
        settings.hrContact.url = event.target.value;
        markDirty();
      });
    }

    if (hrFallbackTextarea) {
      hrFallbackTextarea.value = settings.hrContact.fallbackMessage;
      hrFallbackTextarea.addEventListener('input', (event) => {
        settings.hrContact.fallbackMessage = event.target.value;
        data.sampleResponses.fallback = event.target.value;
        markDirty();
        refreshPreview();
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
        markDirty();
        updateChecklist();
        refreshPreview();
      });
    }

    if (boundaryContracts) {
      boundaryContracts.checked = boundaries.noContractInterpretation;
      boundaryContracts.addEventListener('change', (event) => {
        boundaries.noContractInterpretation = event.target.checked;
        markDirty();
        updateChecklist();
        refreshPreview();
      });
    }

    if (boundaryLegal) {
      boundaryLegal.checked = boundaries.noLegalQuestions;
      boundaryLegal.addEventListener('change', (event) => {
        boundaries.noLegalQuestions = event.target.checked;
        markDirty();
        updateChecklist();
        refreshPreview();
      });
    }

    if (boundaryEscalate) {
      boundaryEscalate.checked = boundaries.alwaysEscalate;
      boundaryEscalate.addEventListener('change', (event) => {
        boundaries.alwaysEscalate = event.target.checked;
        markDirty();
        updateChecklist();
        refreshPreview();
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
          markDirty();
        }
      });
    });

    const languageSelect = document.querySelector('#assistantLanguage');
    if (languageSelect) {
      languageSelect.value = settings.language;
      languageSelect.addEventListener('change', (event) => {
        settings.language = event.target.value;
        markDirty();
      });
    }

    const disclaimerTextarea = document.querySelector('#assistantDisclaimer');
    const resetDisclaimer = document.querySelector('#resetDisclaimer');
    const disclaimerDefault = settings.disclaimer;

    if (disclaimerTextarea) {
      disclaimerTextarea.value = settings.disclaimer;
      disclaimerTextarea.addEventListener('input', (event) => {
        settings.disclaimer = event.target.value;
        markDirty();
        refreshPreview();
      });
    }

    if (resetDisclaimer && disclaimerTextarea) {
      resetDisclaimer.addEventListener('click', () => {
        settings.disclaimer = disclaimerDefault;
        disclaimerTextarea.value = disclaimerDefault;
        markDirty();
        refreshPreview();
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
    updateSaveStatus();
    updateChecklist();
    renderKnowledgeItems();
    renderKnowledgeActions();
    initKnowledgeFilters();
    renderSettings();
    refreshPreview();

    const checklistButtons = document.querySelectorAll(
      '#setupChecklist .checklist-item'
    );
    checklistButtons.forEach((button) => {
      button.addEventListener('click', () => {
        setActiveTab(button.dataset.tabLink);
      });
    });
  }

  window.addEventListener('DOMContentLoaded', init);
})();
