(function () {
  const data = window.HelpinData;
  const DEFAULT_CONFIG = {
    assistantActive: data?.settings?.assistantActive ?? false,
    knowledge: data?.knowledgeContent ?? '',
    hrEmail: data?.settings?.hrContact?.email ?? '',
    hrFallback: data?.settings?.hrContact?.fallbackMessage ?? '',
    disclaimer: data?.settings?.disclaimer ?? '',
    noInfoMessage:
      data?.settings?.noInfoMessage ?? data?.sampleResponses?.fallback ?? '',
    tone: data?.settings?.tone ?? '',
    limits: {
      officialOnly:
        data?.settings?.assistantBoundaries?.onlyOfficialInfo ?? false,
      noPersonal: data?.settings?.assistantBoundaries?.noPersonalCases ?? false,
      noContracts:
        data?.settings?.assistantBoundaries?.noContractInterpretation ?? false,
      noLegal: data?.settings?.assistantBoundaries?.noLegalQuestions ?? false,
      escalate: data?.settings?.assistantBoundaries?.alwaysEscalate ?? false
    },
    updatedAt: null
  };
  let activeTab = 'dashboard';
  let setActiveTab = () => {};
  let dashboardCtaHandler = null;
  let showToggleFeedback = () => {};
  let showSaveFeedback = () => {};
  let showSaveErrorFeedback = () => {};
  let knowledgeDraft = '';
  let knowledgeUpdatedAt = null;
  let contactDraft = null;
  let setPanelSaveState = () => {};
  const settingsTabs = new Set(['settings-contact', 'settings-limits']);
  let adminAccessGranted = false;
  let hasInitialized = false;
  let configUnsubscribe = null;
  const ui = {};

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
    data.settings.tone = config.tone || '';
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
    knowledgeUpdatedAt = Number.isFinite(config.updatedAt)
      ? config.updatedAt
      : null;
  }

  function updateRemoteConfig(updatePayload) {
    if (
      typeof db === 'undefined' ||
      typeof auth === 'undefined' ||
      !auth.currentUser ||
      !adminAccessGranted
    ) {
      return;
    }
    db.ref('config')
      .update(updatePayload)
      .catch((error) => {
        logError('No se pudo guardar la configuración.', error);
        showSaveErrorFeedback();
        setPanelSaveState('Error al guardar, reintenta', 'error');
      });
  }

  function cacheAuthElements() {
    ui.loginView = document.querySelector('#loginView');
    ui.loginForm = document.querySelector('#loginForm');
    ui.loginEmail = document.querySelector('#loginEmail');
    ui.loginPassword = document.querySelector('#loginPassword');
    ui.loginButton = document.querySelector('#loginSubmit');
    ui.loginError = document.querySelector('#loginError');
    ui.adminApp = document.querySelector('#adminApp');
    ui.logoutButton = document.querySelector('#logoutButton');
    ui.noAccessView = document.querySelector('#noAccessView');
    ui.noAccessLogout = document.querySelector('#noAccessLogout');
  }

  function setViewState(state) {
    if (ui.loginView) {
      ui.loginView.hidden = state !== 'login';
    }
    if (ui.adminApp) {
      ui.adminApp.hidden = state !== 'admin';
    }
    if (ui.noAccessView) {
      ui.noAccessView.hidden = state !== 'no-access';
    }
  }

  function setLoginError(message) {
    if (!ui.loginError) {
      return;
    }
    if (!message) {
      ui.loginError.textContent = '';
      ui.loginError.hidden = true;
      return;
    }
    ui.loginError.textContent = message;
    ui.loginError.hidden = false;
  }

  function setLoginLoading(isLoading) {
    if (ui.loginButton) {
      ui.loginButton.disabled = isLoading;
      ui.loginButton.textContent = isLoading ? 'Ingresando…' : 'Ingresar';
    }
    if (ui.loginForm) {
      ui.loginForm.setAttribute('aria-busy', isLoading ? 'true' : 'false');
    }
  }

  function resetLoginForm() {
    if (ui.loginForm) {
      ui.loginForm.reset();
    }
    setLoginError('');
    setLoginLoading(false);
  }

  async function checkAdminAllowlist(user) {
    if (!user || typeof db === 'undefined') {
      return false;
    }
    try {
      const snapshot = await db.ref(`admins/${user.uid}`).once('value');
      return snapshot.exists() && snapshot.val() === true;
    } catch (error) {
      logError('No se pudo validar el acceso de administrador.', error);
      return false;
    }
  }

  function stopConfigSubscription() {
    if (typeof configUnsubscribe === 'function') {
      configUnsubscribe();
      configUnsubscribe = null;
    }
  }

  function handleLogout() {
    if (typeof auth === 'undefined') {
      return;
    }
    auth.signOut().catch((error) => {
      logError('No se pudo cerrar sesión.', error);
    });
  }

  function handleLoginSubmit(event) {
    event.preventDefault();
    if (typeof auth === 'undefined') {
      setLoginError('No se pudo iniciar sesión. Intenta nuevamente.');
      return;
    }
    const email = ui.loginEmail?.value?.trim() || '';
    const password = ui.loginPassword?.value || '';
    if (!email || !password) {
      setLoginError('Ingresa tu email y contraseña.');
      return;
    }
    setLoginLoading(true);
    setLoginError('');
    auth
      .signInWithEmailAndPassword(email, password)
      .then(() => {
        resetLoginForm();
      })
      .catch(() => {
        setLoginError('Email o contraseña incorrectos.');
      })
      .finally(() => {
        setLoginLoading(false);
      });
  }

  function getSetupCompletion() {
    const settings = data.settings || {};
    const knowledgeContent = data.knowledgeContent || '';
    const hrEmail = settings.hrContact?.email?.trim() || '';
    const hrFallback = settings.hrContact?.fallbackMessage?.trim() || '';
    const boundaries = settings.assistantBoundaries || {};
    const boundariesEnabled = Object.values(boundaries).some(Boolean);
    const hasVisibleContactEmail = hasDisplayedContactEmail();

    return {
      knowledge: knowledgeContent.trim().length > 0,
      hr: Boolean(hrEmail || hrFallback || hasVisibleContactEmail),
      activation: Boolean(settings.assistantActive),
      boundaries: boundariesEnabled
    };
  }

  function hasDisplayedContactEmail() {
    const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
    const summaryContact = document.querySelector('#summaryHrContact');
    const hrEmailInput = document.querySelector('#hrEmail');
    const candidates = [
      summaryContact?.textContent || '',
      hrEmailInput?.value || ''
    ];

    return candidates.some((value) => emailPattern.test(value));
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
    updateKnowledgeMetadata();
    updateDashboardStatus();
  }

  function getCharacterCount(value) {
    if (typeof value !== 'string') {
      return 0;
    }
    return value.length;
  }

  function formatKnowledgeUpdatedAt(timestamp) {
    if (!Number.isFinite(timestamp)) {
      return '';
    }
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} · ${hours}:${minutes}`;
  }

  function updateKnowledgeMetadata() {
    const meta = document.querySelector('#knowledgeMeta');
    const countElement = document.querySelector('#knowledgeCharCount');
    const updatedAtElement = document.querySelector('#knowledgeUpdatedAt');
    if (!meta || !countElement || !updatedAtElement) {
      return;
    }
    const draftValue = typeof knowledgeDraft === 'string' ? knowledgeDraft : '';
    const count = getCharacterCount(draftValue);
    const formattedCount = new Intl.NumberFormat('es-CL').format(count);
    const formattedUpdatedAt = formatKnowledgeUpdatedAt(knowledgeUpdatedAt);
    const updatedAtLabel = formattedUpdatedAt
      ? formattedUpdatedAt
      : '—';
    countElement.textContent = formattedCount;
    updatedAtElement.textContent = updatedAtLabel;
  }

  function updateDashboardStatus() {
    const assistantStatusValue = document.querySelector(
      '#assistantStatusValue'
    );
    const assistantStatusSubtitle = document.querySelector(
      '#assistantStatusSubtitle'
    );
    const assistantStateTitle = document.querySelector('#assistantStateTitle');
    const assistantStateMessage = document.querySelector('#assistantStateMessage');
    const ctaButton = document.querySelector('#dashboardCta');
    const completion = getSetupCompletion();
    const assistantActive = completion.activation;

    let statusLabel = '🟡 No activo';
    let statusMessage = 'Falta completar la configuración';
    let ctaLabel = 'Probar como colaborador';
    let ctaTarget = '';
    let ctaType = 'chat';

    if (assistantActive) {
      statusLabel = '🟢 Activo';
      statusMessage = 'Disponible para colaboradores';
      ctaLabel = 'Probar como colaborador';
      ctaType = 'chat';
    } else if (completion.knowledge && completion.hr) {
      statusLabel = '🔴 Desactivado';
      statusMessage = 'El asistente está apagado';
      ctaType = 'chat';
    } else if (!completion.knowledge) {
      ctaType = 'chat';
    } else if (!completion.hr) {
      ctaType = 'chat';
    }

    if (assistantStatusValue) {
      assistantStatusValue.textContent = statusLabel;
    }
    if (assistantStatusSubtitle) {
      assistantStatusSubtitle.textContent = statusMessage;
    }
    if (assistantStateTitle) {
      const statusText = assistantActive
        ? 'ASISTENTE ACTIVO'
        : 'ASISTENTE INACTIVO';
      const statusLabelElement = assistantStateTitle.querySelector(
        '.status-text'
      );
      if (statusLabelElement) {
        statusLabelElement.textContent = statusText;
      } else {
        assistantStateTitle.textContent = statusText;
      }
      assistantStateTitle.dataset.status = assistantActive
        ? 'active'
        : 'inactive';
    }
    if (assistantStateMessage) {
      assistantStateMessage.textContent = assistantActive
        ? 'El asistente está activo'
        : 'El asistente está desactivado';
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
    const saveStatus = document.querySelector('#saveKnowledgeStatus');
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
        knowledgeUpdatedAt = Date.now();
        updateRemoteConfig({
          knowledge: data.knowledgeContent,
          updatedAt: knowledgeUpdatedAt
        });
        updateKnowledgeStatus();
        updateActivationSummary();
        if (saveStatus) {
          saveStatus.classList.add('is-visible');
          setTimeout(() => {
            saveStatus.classList.remove('is-visible');
          }, 2600);
        }
        showSaveFeedback();
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
      updateDashboardStatus();
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
    contactDraft = {
      hrEmail: settings.hrContact.email || '',
      hrUrl: settings.hrContact.url || '',
      hrFallback: settings.hrContact.fallbackMessage || '',
      disclaimer: settings.disclaimer || ''
    };

    if (hrEmailInput) {
      hrEmailInput.value = contactDraft.hrEmail;
      hrEmailInput.addEventListener('input', (event) => {
        contactDraft.hrEmail = event.target.value;
      });
    }

    if (hrUrlInput) {
      hrUrlInput.value = contactDraft.hrUrl;
      hrUrlInput.addEventListener('input', (event) => {
        contactDraft.hrUrl = event.target.value;
      });
    }

    if (hrFallbackTextarea) {
      hrFallbackTextarea.value = contactDraft.hrFallback;
      hrFallbackTextarea.addEventListener('input', (event) => {
        contactDraft.hrFallback = event.target.value;
      });
    }

    if (noInfoMessageTextarea) {
      noInfoMessageTextarea.value = settings.noInfoMessage;
      noInfoMessageTextarea.addEventListener('input', (event) => {
        settings.noInfoMessage = event.target.value;
        data.sampleResponses.fallback = event.target.value;
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

    const saveLimitsButton = document.querySelector('#saveLimits');
    const saveLimitsStatus = document.querySelector('#saveLimitsStatus');
    if (saveLimitsButton) {
      const defaultLabel = saveLimitsButton.textContent.trim();
      let statusTimeout = null;
      let statusResetTimeout = null;

      saveLimitsButton.addEventListener('click', () => {
        if (statusTimeout) {
          clearTimeout(statusTimeout);
        }
        if (statusResetTimeout) {
          clearTimeout(statusResetTimeout);
        }

        const payload = {
          noInfoMessage: settings.noInfoMessage,
          tone: settings.tone || '',
          'limits/officialOnly': boundaries.onlyOfficialInfo,
          'limits/noPersonal': boundaries.noPersonalCases,
          'limits/noContracts': boundaries.noContractInterpretation,
          'limits/noLegal': boundaries.noLegalQuestions,
          'limits/escalate': boundaries.alwaysEscalate
        };

        saveLimitsButton.textContent = 'Guardando…';
        saveLimitsButton.disabled = true;
        updateRemoteConfig(payload);

        statusTimeout = setTimeout(() => {
          saveLimitsButton.textContent = defaultLabel;
          saveLimitsButton.disabled = false;
          if (saveLimitsStatus) {
            saveLimitsStatus.classList.add('is-visible');
            statusResetTimeout = setTimeout(() => {
              saveLimitsStatus.classList.remove('is-visible');
            }, 2600);
          }
          showSaveFeedback();
        }, 700);
      });
    }

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
    if (disclaimerTextarea) {
      disclaimerTextarea.value = contactDraft.disclaimer;
      disclaimerTextarea.addEventListener('input', (event) => {
        contactDraft.disclaimer = event.target.value;
      });
    }

    const saveContactButton = document.querySelector('#saveContact');
    const saveContactStatus = document.querySelector('#saveContactStatus');
    if (saveContactButton) {
      const defaultLabel = saveContactButton.textContent.trim();
      let statusTimeout = null;
      let statusResetTimeout = null;

      saveContactButton.addEventListener('click', () => {
        if (statusTimeout) {
          clearTimeout(statusTimeout);
        }
        if (statusResetTimeout) {
          clearTimeout(statusResetTimeout);
        }

        settings.hrContact.email = contactDraft.hrEmail;
        settings.hrContact.url = contactDraft.hrUrl;
        settings.hrContact.fallbackMessage = contactDraft.hrFallback;
        settings.disclaimer = contactDraft.disclaimer;
        data.sampleResponses.fallback = settings.hrContact.fallbackMessage;

        saveContactButton.textContent = 'Guardando…';
        saveContactButton.disabled = true;
        updateRemoteConfig({
          hrEmail: settings.hrContact.email,
          hrUrl: settings.hrContact.url,
          hrFallback: settings.hrContact.fallbackMessage,
          disclaimer: settings.disclaimer
        });
        updateActivationSummary();
        updateDashboardStatus();

        statusTimeout = setTimeout(() => {
          saveContactButton.textContent = defaultLabel;
          saveContactButton.disabled = false;
          if (saveContactStatus) {
            saveContactStatus.classList.add('is-visible');
            statusResetTimeout = setTimeout(() => {
              saveContactStatus.classList.remove('is-visible');
            }, 2600);
          }
          showSaveFeedback();
        }, 700);
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
    const hrFallback = settings.hrContact?.fallbackMessage?.trim() || '';
    const contactValue = hrEmail || hrFallback || 'Sin definir';
    const formattedKnowledgeUpdate = formatKnowledgeUpdatedAt(knowledgeUpdatedAt);

    renderDashboardSummary(
      summaryUpdate,
      summaryContact,
      knowledgeContent.trim().length > 0
        ? formattedKnowledgeUpdate || 'Actualizado'
        : 'Sin contenido',
      contactValue
    );
  }

  function renderDashboardSummary(
    summaryUpdate,
    summaryContact,
    updateValue,
    contactValue
  ) {
    if (summaryUpdate) {
      summaryUpdate.textContent = updateValue;
    }
    if (summaryContact) {
      summaryContact.textContent = contactValue;
    }
  }

  function subscribeConfigFromFirebase(handleConfigUpdate) {
    if (typeof db === 'undefined') {
      handleConfigUpdate(mergeConfig());
      return null;
    }
    const ref = db.ref('config');
    const onValue = (snapshot) => {
      const config = snapshot.exists()
        ? mergeConfig(snapshot.val())
        : mergeConfig();
      handleConfigUpdate(config);
    };
    const onError = (error) => {
      logError('No se pudo cargar la configuración.', error);
      handleConfigUpdate(mergeConfig());
    };
    ref.on(
      'value',
      onValue,
      onError
    );
    return () => ref.off('value', onValue);
  }

  function initAdminUIOnce() {
    if (hasInitialized) {
      return;
    }
    initTabs();
    initKnowledgeEditor();
    renderSettings();
    renderActivity();

    const toggleFeedback = document.querySelector('#toggleFeedback');
    const saveFeedback = document.querySelector('#saveFeedback');
    const saveErrorFeedback = document.querySelector('#saveErrorFeedback');
    const panelSaveState = document.querySelector('#panelSaveState');
    const createFeedbackController = (element, callback) => {
      let timeout = null;
      return () => {
        if (!element) {
          return;
        }
        element.classList.add('is-visible');
        if (callback) {
          callback();
        }
        if (timeout) {
          clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
          element.classList.remove('is-visible');
        }, 2200);
      };
    };

    const createPanelSaveState = (element) => {
      let timeout = null;
      return (message, state) => {
        if (!element) {
          return;
        }
        if (message) {
          element.textContent = message;
        }
        if (state) {
          element.dataset.state = state;
        } else {
          delete element.dataset.state;
        }
        if (timeout) {
          clearTimeout(timeout);
        }
        if (state === 'success' || state === 'error') {
          timeout = setTimeout(() => {
            delete element.dataset.state;
          }, 4000);
        }
      };
    };

    setPanelSaveState = createPanelSaveState(panelSaveState);

    showToggleFeedback = createFeedbackController(toggleFeedback);
    showSaveFeedback = createFeedbackController(saveFeedback, () => {
      setPanelSaveState('Cambios guardados', 'success');
    });
    showSaveErrorFeedback = createFeedbackController(saveErrorFeedback, () => {
      setPanelSaveState('Error al guardar, reintenta', 'error');
    });

    const toggleInputs = document.querySelectorAll('.toggle-input');
    toggleInputs.forEach((toggle) => {
      toggle.addEventListener('change', () => {
        showToggleFeedback();
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

    const saveAllButton = document.querySelector('#saveAllChanges');
    if (saveAllButton) {
      const labelElement = saveAllButton.querySelector('span');
      const defaultLabel = labelElement?.textContent || saveAllButton.textContent;
      let saveTimeout = null;

      saveAllButton.addEventListener('click', () => {
        if (saveTimeout) {
          clearTimeout(saveTimeout);
        }
        setPanelSaveState('Guardando cambios…');
        if (labelElement) {
          labelElement.textContent = 'Guardando…';
        } else {
          saveAllButton.textContent = 'Guardando…';
        }
        saveAllButton.disabled = true;

        document.querySelector('#saveKnowledge')?.click();
        document.querySelector('#saveContact')?.click();
        document.querySelector('#saveLimits')?.click();

        saveTimeout = setTimeout(() => {
          if (labelElement) {
            labelElement.textContent = defaultLabel;
          } else {
            saveAllButton.textContent = defaultLabel;
          }
          saveAllButton.disabled = false;
          showSaveFeedback();
        }, 900);
      });
    }

    hasInitialized = true;
  }

  function startAdminSession() {
    stopConfigSubscription();
    const handleConfigUpdate = (config) => {
      applyConfigToData(config);
      updateActivationSummary();
      updateDashboardStatus();
      initAdminUIOnce();
    };

    configUnsubscribe = subscribeConfigFromFirebase(handleConfigUpdate);
  }

  function attachAuthListeners() {
    if (ui.loginForm) {
      ui.loginForm.addEventListener('submit', handleLoginSubmit);
    }
    if (ui.logoutButton) {
      ui.logoutButton.addEventListener('click', handleLogout);
    }
    if (ui.noAccessLogout) {
      ui.noAccessLogout.addEventListener('click', handleLogout);
    }
  }

  function handleAuthState(user) {
    adminAccessGranted = false;
    stopConfigSubscription();
    if (!user) {
      setViewState('login');
      resetLoginForm();
      return;
    }
    checkAdminAllowlist(user).then((hasAccess) => {
      resetLoginForm();
      adminAccessGranted = hasAccess;
      if (!hasAccess) {
        setViewState('no-access');
        return;
      }
      setViewState('admin');
      startAdminSession();
    });
  }

  function init() {
    cacheAuthElements();
    attachAuthListeners();
    setViewState('login');

    if (typeof auth === 'undefined') {
      setLoginError('No se pudo cargar la autenticación.');
      setViewState('login');
      return;
    }

    auth.onAuthStateChanged((user) => {
      handleAuthState(user);
    });
  }

  window.addEventListener('DOMContentLoaded', init);
})();
