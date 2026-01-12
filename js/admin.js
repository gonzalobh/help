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
    const knowledgeContent = data.knowledgeContent || '';
    const hrEmail = settings.hrContact?.email?.trim() || '';
    const hrUrl = settings.hrContact?.url?.trim() || '';

    const completion = {
      knowledge: knowledgeContent.trim().length > 0,
      preview: previewReviewed,
      hr: Boolean(hrEmail || hrUrl),
      activation: Boolean(settings.assistantActive)
    };

    steps.forEach((step) => {
      const key = step.dataset.checkKey || step.dataset.tabLink;
      step.classList.toggle('completed', Boolean(completion[key]));
    });

    const activationStep = checklist.querySelector(
      '[data-check-key="activation"]'
    );
    const activationText = document.querySelector('#activationChecklistText');
    if (activationStep && activationText) {
      if (settings.assistantActive) {
        activationText.textContent = 'Helpin está activo para colaboradores';
        activationStep.classList.add('confirmed');
        activationStep.classList.remove('primary-action');
      } else {
        activationText.textContent = 'Activar el asistente para colaboradores';
        activationStep.classList.remove('confirmed');
        activationStep.classList.add('primary-action');
      }
    }

    const totalSteps = Object.keys(completion).length;
    const completedSteps = Object.values(completion).filter(Boolean).length;
    const progressText = document.querySelector('#setupProgressText');
    const progressBar = document.querySelector('#setupProgressBar');
    const progressTrack = document.querySelector('.progress-bar');
    const progressValue = Math.round((completedSteps / totalSteps) * 100);

    if (progressText) {
      progressText.textContent = `Configuración completada: ${completedSteps} de ${totalSteps}`;
    }
    if (progressBar) {
      progressBar.style.width = `${progressValue}%`;
    }
    if (progressTrack) {
      progressTrack.setAttribute('aria-valuenow', String(completedSteps));
    }
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
    updateStatusCards();
  }

  function updateStatusCards() {
    const assistantStatusValue = document.querySelector(
      '#assistantStatusValue'
    );
    const assistantStatusSubtitle = document.querySelector(
      '#assistantStatusSubtitle'
    );
    const knowledgeStatusValue = document.querySelector('#knowledgeStatusValue');
    const knowledgeStatusSubtitle = document.querySelector(
      '#knowledgeStatusSubtitle'
    );
    const knowledgeContent = data.knowledgeContent || '';
    const assistantActive = Boolean(data.settings?.assistantActive);

    if (assistantStatusValue) {
      assistantStatusValue.textContent = assistantActive ? 'Activo' : 'Inactivo';
    }
    if (assistantStatusSubtitle) {
      assistantStatusSubtitle.textContent = assistantActive
        ? 'Disponible para colaboradores'
        : 'Listo para activar cuando RR. HH. lo apruebe';
    }

    if (knowledgeStatusValue) {
      knowledgeStatusValue.textContent =
        knowledgeContent.trim().length > 0 ? 'Con contenido' : 'Vacía';
    }
    if (knowledgeStatusSubtitle) {
      knowledgeStatusSubtitle.textContent =
        knowledgeContent.trim().length > 0
          ? 'Última actualización: hoy'
          : 'Pendiente de carga oficial';
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
    const noInfoMessageTextarea = document.querySelector('#noInfoMessage');
    const countryContextSelect = document.querySelector('#countryContext');
    const assistantActiveToggle = document.querySelector('#assistantActive');

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
        updateChecklist();
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

    if (noInfoMessageTextarea) {
      noInfoMessageTextarea.value = settings.noInfoMessage;
      noInfoMessageTextarea.addEventListener('input', (event) => {
        settings.noInfoMessage = event.target.value;
        data.sampleResponses.fallback = event.target.value;
        markDirty();
        refreshPreview();
      });
    }

    if (countryContextSelect) {
      countryContextSelect.value = settings.countryContext;
      countryContextSelect.addEventListener('change', (event) => {
        settings.countryContext = event.target.value;
        markDirty();
        refreshPreview();
      });
    }

    if (assistantActiveToggle) {
      assistantActiveToggle.checked = settings.assistantActive;
      assistantActiveToggle.addEventListener('change', (event) => {
        settings.assistantActive = event.target.checked;
        markDirty();
        updateChecklist();
        updateStatusCards();
      });
    }

    const boundaries = settings.assistantBoundaries;
    const boundaryOfficialOnly = document.querySelector('#boundaryOfficialOnly');
    const boundaryPersonal = document.querySelector('#boundaryPersonal');
    const boundaryContracts = document.querySelector('#boundaryContracts');
    const boundaryLegal = document.querySelector('#boundaryLegal');
    const boundaryEscalate = document.querySelector('#boundaryEscalate');

    if (boundaryOfficialOnly) {
      boundaryOfficialOnly.checked = boundaries.onlyOfficialInfo;
      boundaryOfficialOnly.addEventListener('change', (event) => {
        boundaries.onlyOfficialInfo = event.target.checked;
        markDirty();
        refreshPreview();
      });
    }

    if (boundaryPersonal) {
      boundaryPersonal.checked = boundaries.noPersonalCases;
      boundaryPersonal.addEventListener('change', (event) => {
        boundaries.noPersonalCases = event.target.checked;
        markDirty();
        refreshPreview();
      });
    }

    if (boundaryContracts) {
      boundaryContracts.checked = boundaries.noContractInterpretation;
      boundaryContracts.addEventListener('change', (event) => {
        boundaries.noContractInterpretation = event.target.checked;
        markDirty();
        refreshPreview();
      });
    }

    if (boundaryLegal) {
      boundaryLegal.checked = boundaries.noLegalQuestions;
      boundaryLegal.addEventListener('change', (event) => {
        boundaries.noLegalQuestions = event.target.checked;
        markDirty();
        refreshPreview();
      });
    }

    if (boundaryEscalate) {
      boundaryEscalate.checked = boundaries.alwaysEscalate;
      boundaryEscalate.addEventListener('change', (event) => {
        boundaries.alwaysEscalate = event.target.checked;
        markDirty();
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

    const languageOptions = Array.from(
      document.querySelectorAll('input[name="assistantLanguage"]')
    );
    if (languageOptions.length) {
      const selectedLanguages = Array.isArray(settings.languages)
        ? settings.languages
        : settings.language
        ? [settings.language]
        : [];

      languageOptions.forEach((option) => {
        option.checked = selectedLanguages.includes(option.value);
        option.addEventListener('change', () => {
          settings.languages = languageOptions
            .filter((input) => input.checked)
            .map((input) => input.value);
          markDirty();
        });
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

  function renderActivity() {
    const activity = data.activity;
    if (!activity) {
      return;
    }
    const count = document.querySelector('#activityCount');
    const countSummary = document.querySelector('#activityCountSummary');
    const topics = document.querySelector('#activityTopics');
    const topTopic = document.querySelector('#activityTopTopic');

    if (count) {
      count.textContent = activity.last7DaysCount;
    }
    if (countSummary) {
      countSummary.textContent = activity.last7DaysCount;
    }
    if (topics) {
      topics.innerHTML = '';
      activity.topTopics.slice(0, 3).forEach((topic) => {
        const item = document.createElement('li');
        item.textContent = topic;
        topics.appendChild(item);
      });
    }
    if (topTopic) {
      topTopic.textContent = activity.topTopics[0] || 'Sin datos aún';
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
    updateStatusCards();
    updateChecklist();
    initKnowledgeEditor();
    renderSettings();
    renderActivity();
    refreshPreview();

    const tabLinks = document.querySelectorAll('[data-tab-link]');
    tabLinks.forEach((button) => {
      button.addEventListener('click', () => {
        setActiveTab(button.dataset.tabLink);
      });
    });
  }

  window.addEventListener('DOMContentLoaded', init);
})();
