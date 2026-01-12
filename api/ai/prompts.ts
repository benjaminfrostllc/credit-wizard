export const PROMPT_VERSION = '2024-09-20'

export const CHAT_SYSTEM_PROMPT = `You are Credit Wizard's in-app financial coach.

Mission:
- Provide actionable, concise guidance on budgeting, credit utilization, and credit repair habits.
- Be credit-repair-aware and aligned with Credit Wizard workflows.
- Do NOT provide legal, tax, or financial guarantees. If asked for legal or financial certainty, say you cannot guarantee outcomes.

Style:
- Keep responses brief (5-7 bullet points max).
- Use clear, supportive language.
- Offer next steps and small, practical actions.
- Avoid jargon; explain acronyms.

Safety:
- Never request or store passwords, SSNs, or full account numbers.
- If asked for sensitive data, advise the user not to share it.
`

export const INSIGHTS_SYSTEM_PROMPT = `You are Credit Wizard's backend insights generator for monthly reports and anomaly explanations.

Goals:
- Produce concise, actionable insights for the user.
- Highlight trends, risks, and opportunities.
- Avoid legal or financial guarantees.

Output format:
- Provide a short summary paragraph (2-3 sentences).
- Provide 3-5 bullet actions.
- Provide 2-3 bullet risks or watch-outs.
`

export const TOOL_DEFINITIONS = [
  {
    name: 'categorize_ambiguous_transaction',
    description:
      'Suggest a category for a transaction when the merchant is ambiguous. Return a best-guess category and confidence.',
    input_schema: {
      type: 'object',
      properties: {
        merchant: { type: 'string' },
        amount: { type: 'number' },
        date: { type: 'string' },
        memo: { type: 'string' },
        existingCategories: { type: 'array', items: { type: 'string' } },
      },
      required: ['merchant', 'amount'],
    },
  },
  {
    name: 'suggest_budget_allocation',
    description:
      'Suggest budget allocation adjustments based on current spend, remaining budget, and goals.',
    input_schema: {
      type: 'object',
      properties: {
        categories: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              spent: { type: 'number' },
              budgeted: { type: 'number' },
            },
            required: ['name', 'spent'],
          },
        },
        monthlyIncome: { type: 'number' },
        savingsGoal: { type: 'number' },
      },
      required: ['categories', 'monthlyIncome'],
    },
  },
  {
    name: 'suggest_savings_opportunities',
    description:
      'Identify savings opportunities based on recurring charges, high-spend categories, and upcoming bills.',
    input_schema: {
      type: 'object',
      properties: {
        recurringCharges: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              amount: { type: 'number' },
              frequency: { type: 'string' },
            },
            required: ['name', 'amount'],
          },
        },
        topCategories: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              spent: { type: 'number' },
            },
            required: ['name', 'spent'],
          },
        },
      },
      required: ['recurringCharges'],
    },
  },
]

export const CHAT_MODEL = 'claude-3-5-sonnet-20240620'
export const INSIGHTS_MODEL = 'claude-3-5-sonnet-20240620'
