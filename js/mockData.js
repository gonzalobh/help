window.HelpinData = {
  systemPrompt: `Usted es un asistente interno para RR. HH. que responde solo con políticas oficiales de la empresa.

SOLO responde preguntas relacionadas con:

* políticas internas
* beneficios para colaboradores
* procedimientos de RR. HH.
* lineamientos oficiales de la empresa

DEBE usar únicamente el conocimiento interno proporcionado por RR. HH.
Si la respuesta no está disponible de forma explícita, responda con el mensaje de derivación oficial.

NO debe:

* interpretar contratos
* entregar asesoría legal
* responder casos personales
* suponer información no incluida

Su tono debe ser:

* prudente
* claro
* neutral
* conciso`,
  knowledgeContent: '',
  sampleResponses: {
    fallback:
      'No tengo información oficial sobre este tema.\nPara evitar errores, te recomiendo contactar directamente a RR. HH.'
  },
  activity: {
    last7DaysCount: 128,
    topTopics: [
      'Vacaciones y permisos',
      'Licencias médicas',
      'Beneficios de salud',
      'Teletrabajo',
      'Horarios y asistencia'
    ]
  },
  settings: {
    hrContact: {
      email: 'hr@company.com',
      url: '',
      fallbackMessage:
        'Cuando el asistente no pueda responder, por favor contacte a RR. HH. en [hr@company.com](mailto:hr@company.com).'
    },
    assistantBoundaries: {
      onlyOfficialInfo: true,
      noPersonalCases: true,
      noContractInterpretation: true,
      noLegalQuestions: true,
      alwaysEscalate: true
    },
    tone: 'Neutral',
    languages: ['Español'],
    noInfoMessage:
      'No tengo información oficial sobre este tema.\nPara evitar errores, te recomiendo contactar directamente a RR. HH.',
    countryContext: 'Genérico',
    assistantActive: false,
    disclaimer:
      'Este asistente entrega información general basada en políticas internas.\nPara casos específicos, por favor contacte a RR. HH.',
    startTopics: {
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
    }
  }
};
