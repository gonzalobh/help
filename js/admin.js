(function () {
  const data = window.HelpinData;
  let activeTab = 'dashboard';
  let isDirty = false;
  let saveTimer = null;
  let setActiveTab = () => {};
  let isEditingActive = false;
  let dashboardCtaHandler = null;

  function getSetupCompletion() {
    const settings = data.settings || {};
    const knowledgeContent = data.knowledgeContent || '';
    const hrEmail = settings.hrContact?.email?.trim() || '';
    const hrUrl = settings.hrContact?.url?.trim() || '';
    const boundaries = settings.assistantBoundaries || {};
    const boundariesEnabled = Object.values(boundaries).some(Boolean);

    return {
      knowledge: knowledgeContent.trim().length > 0,
      hr: Boolean(hrEmail || hrUrl),
      activation: Boolean(settings.assistantActive),
      boundaries: boundariesEnabled
    };
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
      chatLink.hidden = activeTab === 'dashboard';
    }
  }

  function updateChecklist() {
    const checklist = document.querySelector('#setupChecklist');
    if (!checklist) {
      return;
    }
    const steps = checklist.querySelectorAll('.checklist-item');
    const settings = data.settings || {};
    const completion = getSetupCompletion();

    steps.forEach((step) => {
      const key = step.dataset.checkKey || step.dataset.tabLink;
      step.classList.toggle('completed', Boolean(completion[key]));
    });

    const activationStep = checklist.querySelector(
      '[data-check-key="activation"]'
    );
    if (activationStep) {
      if (settings.assistantActive) {
        activationStep.classList.add('confirmed');
        activationStep.classList.remove('primary-action');
      } else {
        activationStep.classList.remove('confirmed');
        activationStep.classList.remove('primary-action');
      }
    }

    updateDashboardStatus();
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
    updateDashboardStatus();
  }

  function updateDashboardStatus() {
    const assistantStatusValue = document.querySelector(
      '#assistantStatusValue'
    );
    const assistantStatusSubtitle = document.querySelector(
      '#assistantStatusSubtitle'
    );
    const ctaButton = document.querySelector('#dashboardCta');
    const completion = getSetupCompletion();
    const assistantActive = completion.activation;

    let statusLabel = '🟡 No activo';
    let statusMessage = 'Falta completar la configuración';
    let ctaLabel = 'Continuar configuración';
    let ctaTarget = 'knowledge';
    let ctaType = 'tab';

    if (assistantActive) {
      statusLabel = '🟢 Activo';
      statusMessage = 'Disponible para colaboradores';
      ctaLabel = 'Editar configuración';
      ctaTarget = 'activation';
      ctaType = 'tab';
    } else if (completion.knowledge && completion.hr) {
      statusLabel = '🔴 Desactivado';
      statusMessage = 'El asistente está apagado';
      ctaTarget = 'activation';
      ctaType = 'tab';
    } else if (!completion.knowledge) {
      ctaTarget = 'knowledge';
    } else if (!completion.hr) {
      ctaTarget = 'activation';
    }

    if (assistantStatusValue) {
      assistantStatusValue.textContent = statusLabel;
    }
    if (assistantStatusSubtitle) {
      assistantStatusSubtitle.textContent = statusMessage;
    }

    if (ctaButton) {
      ctaButton.textContent = ctaLabel;
      ctaButton.dataset.ctaType = ctaType;
      ctaButton.dataset.tabLink = ctaType === 'tab' ? ctaTarget : '';
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
      updateActivationSummary();
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
        updateActivationSummary();
      });
    }

    if (hrUrlInput) {
      hrUrlInput.value = settings.hrContact.url;
      hrUrlInput.addEventListener('input', (event) => {
        settings.hrContact.url = event.target.value;
        markDirty();
        updateChecklist();
        updateActivationSummary();
      });
    }

    if (hrFallbackTextarea) {
      hrFallbackTextarea.value = settings.hrContact.fallbackMessage;
      hrFallbackTextarea.addEventListener('input', (event) => {
        settings.hrContact.fallbackMessage = event.target.value;
        data.sampleResponses.fallback = event.target.value;
        markDirty();
        updateActivationSummary();
      });
    }

    if (noInfoMessageTextarea) {
      noInfoMessageTextarea.value = settings.noInfoMessage;
      noInfoMessageTextarea.addEventListener('input', (event) => {
        settings.noInfoMessage = event.target.value;
        data.sampleResponses.fallback = event.target.value;
        markDirty();
      });
    }

    if (countryContextSelect) {
      countryContextSelect.value = settings.countryContext;
      countryContextSelect.addEventListener('change', (event) => {
        settings.countryContext = event.target.value;
        markDirty();
      });
    }

    if (assistantActiveToggle) {
      assistantActiveToggle.checked = settings.assistantActive;
      assistantActiveToggle.addEventListener('change', (event) => {
        settings.assistantActive = event.target.checked;
        markDirty();
        updateChecklist();
        updateDashboardStatus();
        if (settings.assistantActive) {
          isEditingActive = false;
        }
        updateActivationView();
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
      });
    }

    if (boundaryPersonal) {
      boundaryPersonal.checked = boundaries.noPersonalCases;
      boundaryPersonal.addEventListener('change', (event) => {
        boundaries.noPersonalCases = event.target.checked;
        markDirty();
      });
    }

    if (boundaryContracts) {
      boundaryContracts.checked = boundaries.noContractInterpretation;
      boundaryContracts.addEventListener('change', (event) => {
        boundaries.noContractInterpretation = event.target.checked;
        markDirty();
      });
    }

    if (boundaryLegal) {
      boundaryLegal.checked = boundaries.noLegalQuestions;
      boundaryLegal.addEventListener('change', (event) => {
        boundaries.noLegalQuestions = event.target.checked;
        markDirty();
      });
    }

    if (boundaryEscalate) {
      boundaryEscalate.checked = boundaries.alwaysEscalate;
      boundaryEscalate.addEventListener('change', (event) => {
        boundaries.alwaysEscalate = event.target.checked;
        markDirty();
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
        updateActivationSummary();
      });
    }

    if (resetDisclaimer && disclaimerTextarea) {
      resetDisclaimer.addEventListener('click', () => {
        settings.disclaimer = disclaimerDefault;
        disclaimerTextarea.value = disclaimerDefault;
        markDirty();
        updateActivationSummary();
      });
    }
  }

  function renderActivity() {
    const activity = data.activity;
    if (!activity) {
      return;
    }
    const countSummary = document.querySelector('#activityCountSummary');

    if (countSummary) {
      countSummary.textContent = activity.last7DaysCount;
    }
  }

  function updateActivationSummary() {
    const summaryUpdate = document.querySelector('#summaryKnowledgeUpdate');
    const summaryContact = document.querySelector('#summaryHrContact');
    const settings = data.settings || {};
    const knowledgeContent = data.knowledgeContent || '';
    const hrEmail = settings.hrContact?.email?.trim() || '';
    const hrUrl = settings.hrContact?.url?.trim() || '';
    const contactValue = hrEmail || hrUrl || 'Sin definir';

    if (summaryUpdate) {
      summaryUpdate.textContent =
        knowledgeContent.trim().length > 0 ? 'Hoy' : 'Sin contenido';
    }
    if (summaryContact) {
      summaryContact.textContent = contactValue;
    }
  }

  function updateActivationView() {
    const editable = document.querySelector('#activationEditable');
    const summary = document.querySelector('#activationSummary');
    const activationBlock = document.querySelector('#activationBlock');
    const settings = data.settings || {};
    const assistantActive = Boolean(settings.assistantActive);

    if (!editable || !summary || !activationBlock) {
      return;
    }

    const showSummary = assistantActive && !isEditingActive;
    editable.hidden = showSummary;
    summary.hidden = !showSummary;
    activationBlock.hidden = showSummary;
    updateActivationSummary();
  }

  function initActivationControls() {
    const editButton = document.querySelector('#editActivation');
    if (editButton) {
      editButton.addEventListener('click', () => {
        isEditingActive = true;
        updateActivationView();
      });
    }
  }

  function init() {
    initTabs();
    updateSaveStatus();
    updateDashboardStatus();
    updateChecklist();
    initKnowledgeEditor();
    renderSettings();
    renderActivity();
    initActivationControls();
    updateActivationView();

    const tabLinks = document.querySelectorAll('[data-tab-link]');
    tabLinks.forEach((button) => {
      button.addEventListener('click', () => {
        setActiveTab(button.dataset.tabLink);
      });
    });

    const dashboardCta = document.querySelector('#dashboardCta');
    if (dashboardCta) {
      if (dashboardCtaHandler) {
        dashboardCta.removeEventListener('click', dashboardCtaHandler);
      }
      dashboardCtaHandler = (event) => {
        const ctaType = dashboardCta.dataset.ctaType;
        if (ctaType === 'chat') {
          window.location.href = 'chat.html';
          return;
        }
        const target = dashboardCta.dataset.tabLink;
        if (target) {
          event.preventDefault();
          setActiveTab(target);
        }
      };
      dashboardCta.addEventListener('click', dashboardCtaHandler);
    }

  }

  window.addEventListener('DOMContentLoaded', init);
})();
