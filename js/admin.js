(function () {
  const ADMIN_EMAIL = "gonzalobh@gmail.com";
  const ADMIN_PASSWORD = "mesa4rojo";
  const data = window.HelpinData;
  const DEFAULT_CONFIG = {
    assistantActive: data?.settings?.assistantActive ?? false,
    knowledge: data?.knowledgeContent ?? '',
    hrEmail: data?.settings?.hrContact?.email ?? '',
    hrFallback: data?.settings?.hrContact?.fallbackMessage ?? '',
    disclaimer: data?.settings?.disclaimer ?? '',
    noInfoMessage:
      data?.settings?.noInfoMessage ?? data?.sampleResponses?.fallback ?? '',
    limits: {
      officialOnly:
        data?.settings?.assistantBoundaries?.onlyOfficialInfo ?? false,
      noPersonal: data?.settings?.assistantBoundaries?.noPersonalCases ?? false,
      noContracts:
        data?.settings?.assistantBoundaries?.noContractInterpretation ?? false,
      noLegal: data?.settings?.assistantBoundaries?.noLegalQuestions ?? false,
      escalate: data?.settings?.assistantBoundaries?.alwaysEscalate ?? false
    },
    updatedAt: 0
  };
  let activeTab = 'dashboard';
  let setActiveTab = () => {};
  let dashboardCtaHandler = null;
  let knowledgeDraft = '';
  const settingsTabs = new Set(['settings-contact', 'settings-limits']);

  function logError(message, error) {
    console.error(`[Helpin] ${message}`, error);
  }

  function mergeConfig(remoteConfig) {
    const config = remoteConfig || {};
    return {
      ...DEFAULT_CONFIG,
      ...config,
      limits: {
        ...DEFAULT_CONFIG.limits,
        ...(config.limits || {})
      }
    };
  }

  function applyConfigToData(config) {
    data.knowledgeContent = config.knowledge || '';
    data.settings = data.settings || {};
    data.sampleResponses = data.sampleResponses || {};
    data.settings.hrContact = data.settings.hrContact || {};
    data.settings.assistantBoundaries = data.settings.assistantBoundaries || {};

    data.settings.assistantActive = Boolean(config.assistantActive);
    data.settings.hrContact.email = config.hrEmail || '';
    data.settings.hrContact.fallbackMessage = config.hrFallback || '';
    data.settings.disclaimer = config.disclaimer || '';
    data.settings.noInfoMessage = config.noInfoMessage || '';
    data.sampleResponses.fallback =
      data.settings.noInfoMessage || data.sampleResponses.fallback || '';

    const limits = config.limits || {};
    data.settings.assistantBoundaries.onlyOfficialInfo = Boolean(
      limits.officialOnly
    );
    data.settings.assistantBoundaries.noPersonalCases = Boolean(
      limits.noPersonal
    );
    data.settings.assistantBoundaries.noContractInterpretation = Boolean(
      limits.noContracts
    );
    data.settings.assistantBoundaries.noLegalQuestions = Boolean(
      limits.noLegal
    );
    data.settings.assistantBoundaries.alwaysEscalate = Boolean(limits.escalate);
  }

  function updateRemoteConfig(updatePayload) {
    if (typeof db === 'undefined') {
      return;
    }
    db.ref('config')
      .update(updatePayload)
      .catch((error) => {
        logError('No se pudo guardar la configuración.', error);
      });
  }

  async function ensureAdminAuth() {
    if (typeof auth === 'undefined') {
      return;
    }
    if (auth.currentUser) {
      return;
    }
    try {
      await auth.signInWithEmailAndPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    } catch (error) {
      logError('Error de autenticación.', error);
    }
  }

  async function loadConfigFromFirebase() {
    if (typeof db === 'undefined') {
      return mergeConfig();
    }
    try {
      const snapshot = await db.ref('config').once('value');
      return mergeConfig(snapshot.val());
    } catch (error) {
      logError('No se pudo cargar la configuración.', error);
      return mergeConfig();
    }
  }

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
    const hasDraftChanges =
      knowledgeDraft.trim() !== (data.knowledgeContent || '').trim();
    if (hasDraftChanges) {
      status.textContent = 'Cambios sin guardar';
    } else if (data.knowledgeContent && data.knowledgeContent.trim().length > 0) {
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
      ctaTarget = 'settings-contact';
      ctaType = 'tab';
    } else if (completion.knowledge && completion.hr) {
      statusLabel = '🔴 Desactivado';
      statusMessage = 'El asistente está apagado';
      ctaTarget = 'settings-contact';
      ctaType = 'tab';
    } else if (!completion.knowledge) {
      ctaTarget = 'knowledge';
    } else if (!completion.hr) {
      ctaTarget = 'settings-contact';
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
    const saveButton = document.querySelector('#saveKnowledge');
    if (!textarea) {
      return;
    }
    knowledgeDraft = data.knowledgeContent || '';
    textarea.value = knowledgeDraft;
    updateKnowledgeStatus();
    textarea.addEventListener('input', (event) => {
      knowledgeDraft = event.target.value;
      updateKnowledgeStatus();
    });
    if (saveButton) {
      saveButton.addEventListener('click', () => {
        const nextContent = knowledgeDraft.trim();
        data.knowledgeContent = knowledgeDraft;
        if (nextContent === '') {
          data.knowledgeContent = '';
        }
        updateRemoteConfig({
          knowledge: data.knowledgeContent,
          updatedAt: Date.now()
        });
        updateChecklist();
        updateKnowledgeStatus();
        updateActivationSummary();
      });
    }
  }

  function initTabs() {
    const buttons = Array.from(
      document.querySelectorAll('.tab-button[data-tab-target]')
    );
    const panels = Array.from(document.querySelectorAll('.tab-panel'));
    const settingsToggle = document.querySelector(
      '[data-submenu-toggle="settings"]'
    );
    const settingsSubmenu = document.querySelector('#settingsSubmenu');

    if (!buttons.length || !panels.length) {
      return;
    }

    const syncSettingsState = (target) => {
      const isSettings = Boolean(target?.startsWith('settings-'));
      if (settingsSubmenu) {
        settingsSubmenu.hidden = false;
      }
      if (settingsToggle) {
        settingsToggle.setAttribute('aria-expanded', 'true');
        settingsToggle.classList.toggle('active', isSettings);
      }
    };

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
      syncSettingsState(target);
      updateChecklist();
    };

    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        setActiveTab(button.dataset.tabTarget);
      });
    });

    if (settingsToggle) {
      settingsToggle.addEventListener('click', () => {
        if (!settingsTabs.has(activeTab)) {
          setActiveTab('settings-contact');
        }
      });
    }

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
        updateRemoteConfig({ hrEmail: event.target.value });
        updateChecklist();
        updateActivationSummary();
      });
    }

    if (hrUrlInput) {
      hrUrlInput.value = settings.hrContact.url;
      hrUrlInput.addEventListener('input', (event) => {
        settings.hrContact.url = event.target.value;
        updateChecklist();
        updateActivationSummary();
      });
    }

    if (hrFallbackTextarea) {
      hrFallbackTextarea.value = settings.hrContact.fallbackMessage;
      hrFallbackTextarea.addEventListener('input', (event) => {
        settings.hrContact.fallbackMessage = event.target.value;
        data.sampleResponses.fallback = event.target.value;
        updateRemoteConfig({ hrFallback: event.target.value });
        updateActivationSummary();
      });
    }

    if (noInfoMessageTextarea) {
      noInfoMessageTextarea.value = settings.noInfoMessage;
      noInfoMessageTextarea.addEventListener('input', (event) => {
        settings.noInfoMessage = event.target.value;
        data.sampleResponses.fallback = event.target.value;
        updateRemoteConfig({ noInfoMessage: event.target.value });
      });
    }

    if (countryContextSelect) {
      countryContextSelect.value = settings.countryContext;
      countryContextSelect.addEventListener('change', (event) => {
        settings.countryContext = event.target.value;
      });
    }

    if (assistantActiveToggle) {
      assistantActiveToggle.checked = settings.assistantActive;
      assistantActiveToggle.addEventListener('change', (event) => {
        settings.assistantActive = event.target.checked;
        updateRemoteConfig({ assistantActive: settings.assistantActive });
        updateChecklist();
        updateDashboardStatus();
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
        updateRemoteConfig({ 'limits/officialOnly': event.target.checked });
      });
    }

    if (boundaryPersonal) {
      boundaryPersonal.checked = boundaries.noPersonalCases;
      boundaryPersonal.addEventListener('change', (event) => {
        boundaries.noPersonalCases = event.target.checked;
        updateRemoteConfig({ 'limits/noPersonal': event.target.checked });
      });
    }

    if (boundaryContracts) {
      boundaryContracts.checked = boundaries.noContractInterpretation;
      boundaryContracts.addEventListener('change', (event) => {
        boundaries.noContractInterpretation = event.target.checked;
        updateRemoteConfig({ 'limits/noContracts': event.target.checked });
      });
    }

    if (boundaryLegal) {
      boundaryLegal.checked = boundaries.noLegalQuestions;
      boundaryLegal.addEventListener('change', (event) => {
        boundaries.noLegalQuestions = event.target.checked;
        updateRemoteConfig({ 'limits/noLegal': event.target.checked });
      });
    }

    if (boundaryEscalate) {
      boundaryEscalate.checked = boundaries.alwaysEscalate;
      boundaryEscalate.addEventListener('change', (event) => {
        boundaries.alwaysEscalate = event.target.checked;
        updateRemoteConfig({ 'limits/escalate': event.target.checked });
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
        updateRemoteConfig({ disclaimer: event.target.value });
        updateActivationSummary();
      });
    }

    if (resetDisclaimer && disclaimerTextarea) {
      resetDisclaimer.addEventListener('click', () => {
        settings.disclaimer = disclaimerDefault;
        disclaimerTextarea.value = disclaimerDefault;
        updateRemoteConfig({ disclaimer: disclaimerDefault });
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

  async function init() {
    await ensureAdminAuth();
    const config = await loadConfigFromFirebase();
    applyConfigToData(config);
    initTabs();
    updateDashboardStatus();
    updateChecklist();
    initKnowledgeEditor();
    renderSettings();
    renderActivity();

    const advancedToggle = document.querySelector('#advancedToggle');
    const advancedOptions = document.querySelector('#advancedBoundaryOptions');
    if (advancedToggle && advancedOptions) {
      advancedToggle.addEventListener('click', () => {
        const isExpanded =
          advancedToggle.getAttribute('aria-expanded') === 'true';
        advancedToggle.setAttribute('aria-expanded', String(!isExpanded));
        advancedOptions.hidden = isExpanded;
      });
    }

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
