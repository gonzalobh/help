(function () {
  const data = window.HelpinData;
  const START_TOPICS_MAX = 12;
  const START_TOPICS_ICON_OPTIONS = [
    'calendar',
    'clock',
    'wallet',
    'heart',
    'file',
    'book',
    'users',
    'gift'
  ];

  function getDefaultStartTopics() {
    return {
      enabled: true,
      title: 'Temas frecuentes',
      subtitle: 'Elige un tema o busca una pregunta',
      items: [
        {
          id: 'vacaciones',
          title: 'Vacaciones',
          icon: 'calendar',
          prompt: '¿Cómo solicito vacaciones y cuántos días me corresponden?',
          active: true
        },
        {
          id: 'permisos',
          title: 'Permisos',
          icon: 'clock',
          prompt: '¿Qué permisos existen y cómo se solicitan?',
          active: true
        },
        {
          id: 'licencias',
          title: 'Licencias médicas',
          icon: 'heart',
          prompt: '¿Qué debo hacer si tengo una licencia médica?',
          active: true
        },
        {
          id: 'remuneraciones',
          title: 'Remuneraciones',
          icon: 'wallet',
          prompt: '¿Cuándo se paga el sueldo y dónde veo mi liquidación?',
          active: true
        },
        {
          id: 'beneficios',
          title: 'Beneficios',
          icon: 'gift',
          prompt: '¿Qué beneficios ofrece la empresa y cómo se accede?',
          active: true
        },
        {
          id: 'asistencia',
          title: 'Asistencia y horarios',
          icon: 'clock',
          prompt: '¿Cómo funciona el registro de asistencia y los horarios?',
          active: true
        },
        {
          id: 'certificados',
          title: 'Certificados',
          icon: 'file',
          prompt: '¿Cómo solicito un certificado laboral o de antigüedad?',
          active: true
        },
        {
          id: 'reglamento',
          title: 'Reglamento interno',
          icon: 'book',
          prompt: '¿Dónde consulto el Reglamento Interno y qué puntos clave debo conocer?',
          active: true
        }
      ]
    };
  }

  function normalizeStartTopics(startTopics) {
    const defaults = getDefaultStartTopics();
    if (!startTopics || typeof startTopics !== 'object') {
      return {
        ...defaults,
        items: [...defaults.items]
      };
    }
    const normalized = {
      enabled:
        typeof startTopics.enabled === 'boolean'
          ? startTopics.enabled
          : defaults.enabled,
      title:
        typeof startTopics.title === 'string' && startTopics.title.trim()
          ? startTopics.title
          : defaults.title,
      subtitle:
        typeof startTopics.subtitle === 'string' && startTopics.subtitle.trim()
          ? startTopics.subtitle
          : defaults.subtitle,
      items: []
    };
    const rawItems = Array.isArray(startTopics.items)
      ? startTopics.items
      : defaults.items;
    normalized.items = rawItems
      .filter((item) => item && typeof item === 'object')
      .map((item, index) => {
        const fallback = defaults.items[index] || {};
        return {
          id: String(item.id || fallback.id || `topic-${index}`),
          title:
            typeof item.title === 'string'
              ? item.title
              : fallback.title || '',
          icon:
            typeof item.icon === 'string'
              ? item.icon
              : fallback.icon || 'heart',
          prompt:
            typeof item.prompt === 'string'
              ? item.prompt
              : fallback.prompt || '',
          active:
            typeof item.active === 'boolean'
              ? item.active
              : fallback.active ?? true
        };
      })
      .slice(0, START_TOPICS_MAX);
    return normalized;
  }

  function cloneStartTopics(startTopics) {
    return JSON.parse(JSON.stringify(startTopics));
  }

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
    startTopics: normalizeStartTopics(data?.settings?.startTopics),
    updatedAt: null
  };
  const DEFAULT_PROFILE = {
    name: '',
    contactEmail: '',
    avatar: ''
  };
  let activeTab = 'dashboard';
  let setActiveTab = () => {};
  let showToggleFeedback = () => {};
  let showSaveFeedback = () => {};
  let showSaveErrorFeedback = () => {};
  let knowledgeDraft = '';
  let knowledgeUpdatedAt = null;
  let contactDraft = null;
  let startTopicsDraft = null;
  let setPanelSaveState = () => {};
  const settingsTabs = new Set(['settings-contact', 'settings-limits']);
  let adminAccessGranted = false;
  let hasInitialized = false;
  let configUnsubscribe = null;
  const ui = {};
  let profileDraft = { ...DEFAULT_PROFILE };

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
      },
      startTopics: normalizeStartTopics(config.startTopics)
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
    data.settings.startTopics = normalizeStartTopics(config.startTopics);
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

  function getInitials(name) {
    if (typeof name !== 'string') {
      return 'AD';
    }
    const parts = name
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) {
      return 'AD';
    }
    const initials = parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
    return initials || 'AD';
  }

  function renderProfileAvatar(avatarUrl, name) {
    const avatar = document.querySelector('#profileAvatar');
    const menuButton = document.querySelector('#profileMenuButton');
    const initials = getInitials(name);

    if (avatar) {
      avatar.textContent = initials;
      if (avatarUrl) {
        avatar.style.backgroundImage = `url(${avatarUrl})`;
        avatar.classList.add('has-image');
      } else {
        avatar.style.backgroundImage = '';
        avatar.classList.remove('has-image');
      }
    }

    if (menuButton) {
      menuButton.textContent = initials;
    }
  }

  function loadAdminProfile() {
    if (
      typeof db === 'undefined' ||
      typeof auth === 'undefined' ||
      !auth.currentUser ||
      !adminAccessGranted
    ) {
      return Promise.resolve({ ...DEFAULT_PROFILE });
    }
    return db
      .ref('adminProfile')
      .once('value')
      .then((snapshot) => {
        if (!snapshot.exists()) {
          return { ...DEFAULT_PROFILE };
        }
        const value = snapshot.val() || {};
        return {
          name: value.name || '',
          contactEmail: value.contactEmail || '',
          avatar: value.avatar || ''
        };
      })
      .catch((error) => {
        logError('No se pudo cargar el perfil.', error);
        return { ...DEFAULT_PROFILE };
      });
  }

  function saveAdminProfile(profile) {
    if (
      typeof db === 'undefined' ||
      typeof auth === 'undefined' ||
      !auth.currentUser ||
      !adminAccessGranted
    ) {
      return Promise.reject(new Error('Sin acceso a la base de datos.'));
    }
    return db.ref('adminProfile').set({
      name: profile.name || '',
      contactEmail: profile.contactEmail || '',
      avatar: profile.avatar || ''
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
    ui.authLoader = document.querySelector('#authLoader');
  }

  function setViewState(state) {
    document.body.classList.toggle('auth-mode', state !== 'admin');
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

  function setAuthLoaderVisible(isVisible) {
    if (!ui.authLoader) {
      return;
    }
    ui.authLoader.hidden = !isVisible;
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
    setAuthLoaderVisible(true);
    auth
      .signInWithEmailAndPassword(email, password)
      .then(() => {
        resetLoginForm();
      })
      .catch(() => {
        setLoginError('Email o contraseña incorrectos.');
        setAuthLoaderVisible(false);
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
    const completion = getSetupCompletion();
    const assistantActive = completion.activation;

    let statusLabel = '🟡 No activo';
    let statusMessage = 'Falta completar la configuración';

    if (assistantActive) {
      statusLabel = '🟢 Activo';
      statusMessage = 'Disponible para colaboradores';
    } else if (completion.knowledge && completion.hr) {
      statusLabel = '🔴 Desactivado';
      statusMessage = 'El asistente está apagado';
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

  function initProfileForm() {
    const nameInput = document.querySelector('#profileName');
    const emailInput = document.querySelector('#profileContactEmail');
    const saveButton = document.querySelector('#saveProfile');
    const alert = document.querySelector('#profileFormAlert');
    const uploadButton = document.querySelector('#profileUploadButton');
    const uploadInput = document.querySelector('#profileAvatarInput');

    if (!nameInput || !emailInput || !saveButton) {
      return;
    }

    const showAlert = (message) => {
      if (!alert) {
        return;
      }
      if (message) {
        alert.textContent = message;
        alert.hidden = false;
      } else {
        alert.textContent = '';
        alert.hidden = true;
      }
    };

    const applyProfile = (profile) => {
      profileDraft = {
        ...DEFAULT_PROFILE,
        ...profile
      };
      nameInput.value = profileDraft.name;
      emailInput.value = profileDraft.contactEmail;
      renderProfileAvatar(profileDraft.avatar, profileDraft.name);
    };

    loadAdminProfile().then((profile) => {
      applyProfile(profile);
    });

    nameInput.addEventListener('input', (event) => {
      profileDraft.name = event.target.value;
      renderProfileAvatar(profileDraft.avatar, profileDraft.name);
      showAlert('');
    });

    emailInput.addEventListener('input', (event) => {
      profileDraft.contactEmail = event.target.value;
      showAlert('');
    });

    if (uploadButton && uploadInput) {
      uploadButton.addEventListener('click', () => {
        uploadInput.click();
      });

      uploadInput.addEventListener('change', (event) => {
        const file = event.target.files?.[0];
        if (!file) {
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          const result = typeof reader.result === 'string' ? reader.result : '';
          profileDraft.avatar = result;
          renderProfileAvatar(profileDraft.avatar, profileDraft.name);
        };
        reader.onerror = () => {
          logError('No se pudo leer la imagen del avatar.', reader.error);
        };
        reader.readAsDataURL(file);
      });
    }

    const defaultLabel = saveButton.textContent.trim();
    let resetTimeout = null;

    saveButton.addEventListener('click', () => {
      const nameValue = profileDraft.name.trim();
      const emailValue = profileDraft.contactEmail.trim();
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!nameValue || !emailPattern.test(emailValue)) {
        showAlert('Completa nombre y un email válido.');
        return;
      }

      showAlert('');
      if (resetTimeout) {
        clearTimeout(resetTimeout);
      }
      saveButton.textContent = 'Guardando…';
      saveButton.disabled = true;

      saveAdminProfile({
        name: nameValue,
        contactEmail: emailValue,
        avatar: profileDraft.avatar
      })
        .then(() => {
          saveButton.textContent = 'Perfil guardado';
          resetTimeout = setTimeout(() => {
            saveButton.textContent = defaultLabel;
            saveButton.disabled = false;
          }, 1800);
        })
        .catch((error) => {
          logError('No se pudo guardar el perfil.', error);
          saveButton.textContent = defaultLabel;
          saveButton.disabled = false;
        });
    });
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
    startTopicsDraft = cloneStartTopics(
      normalizeStartTopics(settings.startTopics || getDefaultStartTopics())
    );

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

    const startTopicsEnabledToggle =
      document.querySelector('#startTopicsEnabled');
    const startTopicsTitleInput = document.querySelector('#startTopicsTitle');
    const startTopicsSubtitleInput =
      document.querySelector('#startTopicsSubtitle');
    const startTopicsList = document.querySelector('#startTopicsList');
    const startTopicsAddButton = document.querySelector('#startTopicsAdd');
    const startTopicsRestoreButton =
      document.querySelector('#startTopicsRestore');
    const saveStartTopicsButton = document.querySelector('#saveStartTopics');
    const saveStartTopicsStatus =
      document.querySelector('#saveStartTopicsStatus');

    function buildTopicRow(item, index) {
      const row = document.createElement('div');
      row.className = 'topic-row';

      const head = document.createElement('div');
      head.className = 'topic-row-head';

      const title = document.createElement('div');
      title.className = 'topic-row-title';
      title.textContent = `Tema ${index + 1}`;

      const actions = document.createElement('div');
      actions.className = 'topic-actions';

      const moveUp = document.createElement('button');
      moveUp.type = 'button';
      moveUp.textContent = '↑';
      moveUp.disabled = index === 0;
      moveUp.addEventListener('click', () => {
        if (index === 0) {
          return;
        }
        const newIndex = index - 1;
        const items = startTopicsDraft.items;
        [items[newIndex], items[index]] = [items[index], items[newIndex]];
        renderStartTopicsEditor();
      });

      const moveDown = document.createElement('button');
      moveDown.type = 'button';
      moveDown.textContent = '↓';
      moveDown.disabled = index >= startTopicsDraft.items.length - 1;
      moveDown.addEventListener('click', () => {
        if (index >= startTopicsDraft.items.length - 1) {
          return;
        }
        const newIndex = index + 1;
        const items = startTopicsDraft.items;
        [items[newIndex], items[index]] = [items[index], items[newIndex]];
        renderStartTopicsEditor();
      });

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.textContent = 'Eliminar';
      removeButton.addEventListener('click', () => {
        startTopicsDraft.items.splice(index, 1);
        renderStartTopicsEditor();
      });

      actions.append(moveUp, moveDown, removeButton);
      head.append(title, actions);

      const fields = document.createElement('div');
      fields.className = 'topic-fields';

      const titleField = document.createElement('div');
      const titleLabel = document.createElement('label');
      titleLabel.textContent = 'Título del tema';
      const titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.value = item.title || '';
      titleInput.placeholder = 'Ej: Vacaciones';
      titleInput.addEventListener('input', (event) => {
        item.title = event.target.value;
      });
      titleField.append(titleLabel, titleInput);

      const iconField = document.createElement('div');
      const iconLabel = document.createElement('label');
      iconLabel.textContent = 'Icono';
      const iconSelect = document.createElement('select');
      START_TOPICS_ICON_OPTIONS.forEach((icon) => {
        const option = document.createElement('option');
        option.value = icon;
        option.textContent = icon;
        if (item.icon === icon) {
          option.selected = true;
        }
        iconSelect.appendChild(option);
      });
      iconSelect.addEventListener('change', (event) => {
        item.icon = event.target.value;
      });
      iconField.append(iconLabel, iconSelect);

      const promptField = document.createElement('div');
      const promptLabel = document.createElement('label');
      promptLabel.textContent = 'Pregunta sugerida';
      const promptInput = document.createElement('input');
      promptInput.type = 'text';
      promptInput.value = item.prompt || '';
      promptInput.placeholder = 'Ej: ¿Cómo solicito vacaciones?';
      promptInput.addEventListener('input', (event) => {
        item.prompt = event.target.value;
      });
      const promptMeta = document.createElement('div');
      promptMeta.className = 'topic-meta';
      promptMeta.textContent = 'Pregunta sugerida';
      promptField.append(promptLabel, promptInput, promptMeta);

      const activeField = document.createElement('label');
      activeField.className = 'option-row';
      const activeLabel = document.createElement('span');
      activeLabel.className = 'option-label';
      activeLabel.textContent = 'Activo';
      const activeInput = document.createElement('input');
      activeInput.type = 'checkbox';
      activeInput.className = 'toggle-input';
      activeInput.checked = item.active;
      activeInput.addEventListener('change', (event) => {
        item.active = event.target.checked;
      });
      const activeToggle = document.createElement('span');
      activeToggle.className = 'toggle-switch';
      activeToggle.setAttribute('aria-hidden', 'true');
      activeField.append(activeLabel, activeInput, activeToggle);

      fields.append(titleField, iconField, promptField, activeField);
      row.append(head, fields);
      return row;
    }

    function renderStartTopicsEditor() {
      if (!startTopicsDraft) {
        return;
      }
      if (startTopicsEnabledToggle) {
        startTopicsEnabledToggle.checked = Boolean(startTopicsDraft.enabled);
      }
      if (startTopicsTitleInput) {
        startTopicsTitleInput.value = startTopicsDraft.title || '';
      }
      if (startTopicsSubtitleInput) {
        startTopicsSubtitleInput.value = startTopicsDraft.subtitle || '';
      }
      if (startTopicsList) {
        startTopicsList.innerHTML = '';
        startTopicsDraft.items.forEach((item, index) => {
          startTopicsList.appendChild(buildTopicRow(item, index));
        });
      }
    }

    if (startTopicsEnabledToggle) {
      startTopicsEnabledToggle.addEventListener('change', (event) => {
        startTopicsDraft.enabled = event.target.checked;
      });
    }

    if (startTopicsTitleInput) {
      startTopicsTitleInput.addEventListener('input', (event) => {
        startTopicsDraft.title = event.target.value;
      });
    }

    if (startTopicsSubtitleInput) {
      startTopicsSubtitleInput.addEventListener('input', (event) => {
        startTopicsDraft.subtitle = event.target.value;
      });
    }

    if (startTopicsAddButton) {
      startTopicsAddButton.addEventListener('click', () => {
        if (startTopicsDraft.items.length >= START_TOPICS_MAX) {
          return;
        }
        startTopicsDraft.items.push({
          id: `topic-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          title: '',
          icon: START_TOPICS_ICON_OPTIONS[0],
          prompt: '',
          active: true
        });
        renderStartTopicsEditor();
      });
    }

    if (startTopicsRestoreButton) {
      startTopicsRestoreButton.addEventListener('click', () => {
        startTopicsDraft = cloneStartTopics(getDefaultStartTopics());
        renderStartTopicsEditor();
      });
    }

    if (saveStartTopicsButton) {
      const defaultLabel = saveStartTopicsButton.textContent.trim();
      let statusTimeout = null;
      let statusResetTimeout = null;

      saveStartTopicsButton.addEventListener('click', () => {
        if (statusTimeout) {
          clearTimeout(statusTimeout);
        }
        if (statusResetTimeout) {
          clearTimeout(statusResetTimeout);
        }

        const hasActiveItem = startTopicsDraft.items.some((item) => item.active);
        const normalizedItems = startTopicsDraft.items.slice(0, START_TOPICS_MAX);
        startTopicsDraft.items = normalizedItems;

        saveStartTopicsButton.textContent = 'Guardando…';
        saveStartTopicsButton.disabled = true;
        updateRemoteConfig({
          'startTopics/enabled': Boolean(startTopicsDraft.enabled),
          'startTopics/title': startTopicsDraft.title || '',
          'startTopics/subtitle': startTopicsDraft.subtitle || '',
          'startTopics/items': normalizedItems
        });

        statusTimeout = setTimeout(() => {
          saveStartTopicsButton.textContent = defaultLabel;
          saveStartTopicsButton.disabled = false;
          if (saveStartTopicsStatus) {
            saveStartTopicsStatus.textContent = hasActiveItem
              ? 'Guardado'
              : 'Guardado (sin temas activos)';
            saveStartTopicsStatus.classList.add('is-visible');
            statusResetTimeout = setTimeout(() => {
              saveStartTopicsStatus.classList.remove('is-visible');
            }, 2600);
          }
          settings.startTopics = cloneStartTopics(startTopicsDraft);
          showSaveFeedback();
        }, 700);
      });
    }

    renderStartTopicsEditor();

    const saveAdvancedButton = document.querySelector('#saveAdvanced');
    const saveAdvancedStatus = document.querySelector('#saveAdvancedStatus');
    if (saveAdvancedButton) {
      const defaultLabel = saveAdvancedButton.textContent.trim();
      let statusTimeout = null;
      let statusResetTimeout = null;

      saveAdvancedButton.addEventListener('click', () => {
        if (statusTimeout) {
          clearTimeout(statusTimeout);
        }
        if (statusResetTimeout) {
          clearTimeout(statusResetTimeout);
        }

        settings.disclaimer = contactDraft.disclaimer;

        saveAdvancedButton.textContent = 'Guardando…';
        saveAdvancedButton.disabled = true;
        updateRemoteConfig({
          disclaimer: settings.disclaimer,
          tone: settings.tone || ''
        });

        statusTimeout = setTimeout(() => {
          saveAdvancedButton.textContent = defaultLabel;
          saveAdvancedButton.disabled = false;
          if (saveAdvancedStatus) {
            saveAdvancedStatus.classList.add('is-visible');
            statusResetTimeout = setTimeout(() => {
              saveAdvancedStatus.classList.remove('is-visible');
            }, 2600);
          }
          showSaveFeedback();
        }, 700);
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
    initProfileForm();
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
        document.querySelector('#saveStartTopics')?.click();

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
    let hasLoadedConfig = false;
    const handleConfigUpdate = (config) => {
      applyConfigToData(config);
      updateActivationSummary();
      updateDashboardStatus();
      initAdminUIOnce();
      if (!hasLoadedConfig) {
        hasLoadedConfig = true;
        setAuthLoaderVisible(false);
      }
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
      setAuthLoaderVisible(false);
      return;
    }
    setAuthLoaderVisible(true);
    checkAdminAllowlist(user).then((hasAccess) => {
      resetLoginForm();
      adminAccessGranted = hasAccess;
      if (!hasAccess) {
        setViewState('no-access');
        setAuthLoaderVisible(false);
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
