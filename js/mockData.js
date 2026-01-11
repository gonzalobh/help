window.HelpinData = {
  systemPrompt: `Usted es un asistente interno de preguntas frecuentes y autoservicio para colaboradores.

SOLO responde preguntas relacionadas con:

* políticas internas
* beneficios para colaboradores
* procedimientos de RR. HH.
* lineamientos de la empresa

DEBE usar únicamente el conocimiento interno proporcionado.
Si la respuesta no está disponible de forma explícita, responda:
“Por favor, contacte al equipo de RR. HH. para confirmación.”

NO debe:

* dar asesoría legal
* interpretar contratos
* tomar decisiones
* personalizar casos

Su tono debe ser:

* profesional
* claro
* neutral
* conciso`,
  knowledgeItems: [
    {
      id: 'know-1',
      title: 'Elegibilidad de vacaciones pagadas',
      category: 'Beneficios',
      content:
        'Los colaboradores con jornada completa acumulan 1,5 días de vacaciones pagadas por mes. Las solicitudes de vacaciones deben enviarse con al menos dos semanas de anticipación.'
    },
    {
      id: 'know-2',
      title: 'Lineamientos de trabajo remoto',
      category: 'Políticas',
      content:
        'El trabajo remoto está disponible hasta dos días por semana con aprobación de su jefatura. Los colaboradores deben mantener un horario núcleo de 10:00 a 16:00 hora local.'
    },
    {
      id: 'know-3',
      title: 'Reembolso de gastos',
      category: 'Procedimientos',
      content:
        'Los gastos laborales deben enviarse dentro de 30 días usando el portal de gastos. Se requieren boletas para todos los gastos superiores a $25.'
    }
  ],
  sampleResponses: {
    fallback:
      'Cuando el asistente no pueda responder, por favor contacte a RR. HH. en [hr@company.com](mailto:hr@company.com).'
  },
  settings: {
    hrContact: {
      email: 'hr@company.com',
      url: '',
      fallbackMessage:
        'Cuando el asistente no pueda responder, por favor contacte a RR. HH. en [hr@company.com](mailto:hr@company.com).'
    },
    assistantBoundaries: {
      noPersonalCases: true,
      noContractInterpretation: true,
      noLegalQuestions: true,
      alwaysEscalate: true
    },
    tone: 'Neutral',
    language: 'Español',
    disclaimer:
      'Este asistente entrega solo orientación informativa.\nPara casos específicos, por favor contacte a RR. HH.'
  }
};
