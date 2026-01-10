window.HelpinData = {
  systemPrompt: `You are an internal Employee FAQ & Self-Service assistant.

You ONLY answer questions related to:

* internal policies
* employee benefits
* HR procedures
* company guidelines

You MUST only use the provided internal knowledge.
If the answer is not explicitly available, respond:
“Please contact the HR team for confirmation.”

You do NOT:

* give legal advice
* interpret contracts
* make decisions
* personalize cases

Your tone must be:

* professional
* clear
* neutral
* concise`,
  knowledgeItems: [
    {
      id: 'know-1',
      title: 'Paid time off eligibility',
      category: 'Benefits',
      content:
        'Full-time employees accrue 1.5 days of paid time off per month. PTO requests should be submitted at least two weeks in advance.'
    },
    {
      id: 'know-2',
      title: 'Remote work guidelines',
      category: 'Policies',
      content:
        'Remote work is available up to two days per week with manager approval. Employees must maintain core hours from 10:00 to 16:00 local time.'
    },
    {
      id: 'know-3',
      title: 'Expense reimbursement',
      category: 'Procedures',
      content:
        'Business expenses must be submitted within 30 days using the expense portal. Receipts are required for all expenses over $25.'
    }
  ],
  chatTopics: [
    {
      id: 'topic-1',
      icon: '📄',
      title: 'PTO policy',
      prompt: 'What is the paid time off policy?',
      visible: true
    },
    {
      id: 'topic-2',
      icon: '🏠',
      title: 'Remote work',
      prompt: 'What are the guidelines for remote work?',
      visible: true
    },
    {
      id: 'topic-3',
      icon: '💳',
      title: 'Expenses',
      prompt: 'How do I submit expenses for reimbursement?',
      visible: true
    }
  ],
  sampleResponses: {
    fallback: 'Please contact the HR team for confirmation.'
  }
};
