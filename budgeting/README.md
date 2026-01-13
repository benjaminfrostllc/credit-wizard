# Budgeting Module

## Purpose
The budgeting module provides the domain structure for budgeting features (zero-based budgets, goals, bills, and insights) without affecting existing credit repair flows. It is intentionally scaffolding-only: no runtime logic is wired into the app yet.

## Module Boundaries
Each submodule owns its data contracts and future services. The modules are exposed via `src/budgeting/index.ts` for domain-level imports.

- **plaid-ingestion**: Inbound data from Plaid, ingestion jobs, and webhook payload shapes.
- **transactions**: Normalized transaction records and import requests.
- **categories & rules**: Category definitions and rule-based matchers for auto-categorization.
- **budgets (zero-based)**: Budget plans and allocations.
- **goals**: Savings or payoff targets and progress tracking.
- **debts & utilization**: Debt accounts and utilization snapshots.
- **recurring bills/subscriptions**: Bills, subscriptions, and detection signals.
- **alerts/notifications**: Budget alerts and notification channels.
- **ai insights + chatbot context builder**: Insight requests and chatbot context payloads.

## Data Flow (Future)
1. **Plaid ingestion** receives raw data + webhooks.
2. **Transactions** normalize data for storage and analytics.
3. **Categories & rules** auto-assign categories.
4. **Budgets** consume categorized transactions to calculate zero-based allocations.
5. **Goals** track progress from categorized spending/saving.
6. **Debts & utilization** update with liability data and payment activity.
7. **Recurring bills** detect subscriptions and upcoming obligations.
8. **Alerts** emit notifications for thresholds, due dates, or overspend.
9. **AI insights** aggregate context for recommendations and chatbot responses.

## Events (Planned)
Events will be modeled as domain messages that can be emitted by any module:

- `plaid.ingestion.completed`
- `transactions.imported`
- `categories.rules.applied`
- `budgets.updated`
- `goals.progress.updated`
- `debts.utilization.updated`
- `recurring.detected`
- `alerts.triggered`
- `ai.insight.requested`

## n8n Integration
n8n should subscribe to the domain events above (likely through a webhook or queue bridge) to orchestrate downstream workflows such as:

- triggering notifications
- exporting summarized reports
- kicking off AI analysis runs
- syncing budgets/goals to external tools

The hook point is the event emission layer, which will sit between module services and the app-level integration bus.
