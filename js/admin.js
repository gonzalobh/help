(function () {
  const data = window.HelpinData;
  let previewReviewed = false;
  let activeTab = 'dashboard';
  let isDirty = false;
  let saveTimer = null;
  let setActiveTab = () => {};

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
    const knowledgeContent = data.knowledgeContent || '';

    const completion = {
      knowledge: knowledgeContent.trim().length > 0,
      preview: previewReviewed,
      settings: Boolean(settings.hrContact?.email?.trim()) && boundariesSet
    };

    steps.forEach((step) => {
      const key = step.dataset.tabLink;
      step.classList.toggle('completed', Boolean(completion[key]));
    });
  }

  function updateKnowledgeStatus() {
    const status = document.querySelector('#knowledgeStatus');
    if (!status) {
      return;
    }
    if (data.knowledgeContent && data.knowledgeContent.trim().length > 0) {
      status.textContent = 'Actualizado recién';
    } else {
      status.textContent = 'Sin contenido aún';
    }
  }

  function initKnowledgeEditor() {
    const textarea = document.querySelector('#knowledgeContent');
    if (!textarea) {
      return;
    }
    textarea.value = data.knowledgeContent || '';
    updateKnowledgeStatus();
    textarea.addEventListener('input', (event) => {
      data.knowledgeContent = event.target.value;
      markDirty();
      updateChecklist();
      updateKnowledgeStatus();
      refreshPreview();
    });
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
    initKnowledgeEditor();
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
