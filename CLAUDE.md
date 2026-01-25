# Leverabase - Project Knowledge Base

> This file contains essential context for Claude Code sessions working on this project.

## Brand Information

**Company**: Benjamin Frost LLC
**Platform Name**: **Leverabase** (formerly "Credit Wizard")
**Tagline**: Your Business Credit Command Center

### Domains
- **leverabase.com** - Primary website
- **leverabase.app** - App domain (alternate)
- **App URL**: https://leverabase.com/app (reserved for MVP launch)
- **benjaminfrostllc.com** - Company landing page

### Positioning
Leverabase is a **human consulting platform powered by cutting-edge AI technology**. It's a team of expert consultants helping clients build business credit, secure funding, and accelerate growth with personalized guidance. The platform provides a one-of-a-kind customer experience that other credit companies cannot easily replicate, combining human expertise, AI guidance, bank integration, and a structured 7-stage system.

**Key Messaging**: Clients of Benjamin Frost LLC get exclusive access to the talented minds at Leverabase.

---

## Product Overview

### The Financial Ascent System (7 Stages)

1. **The Foundry** - Entity Creation
   - LLC formation guidance
   - EIN acquisition
   - Registered agent setup
   - Business legal foundation

2. **Identity** - Public Signals
   - D-U-N-S number registration
   - Website establishment
   - Social media presence
   - Business directory listings

3. **The Treasury** - Banking & Capital
   - Business bank account setup
   - Bank relationship building
   - Plaid integration for tracking

4. **Credit Core** - Credit Infrastructure
   - Business credit cards
   - Net-30 tradelines
   - Credit card marketplace

5. **Control** - Risk & Optimization
   - Credit utilization management
   - Payment timing optimization
   - Score improvement strategies

6. **Command** - Monitoring & Compliance
   - Credit monitoring across bureaus
   - Tax compliance
   - Financial statements

7. **The Vault** - Secure Documents
   - Encrypted document storage
   - ID, EIN, LLC documents
   - Access control

### Key Features
- **The Oracle**: AI-powered credit assistant (OpenAI)
- **Plaid Integration**: Real-time bank account connection
- **Dispute Management**: Track disputes across Experian, Equifax, TransUnion
- **Progress Dashboard**: Visual journey tracking
- **PWA Support**: Installable app experience

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **Integrations**: Plaid, OpenAI, GoHighLevel (calendar)
- **Deployment**: Vercel

---

## Project Structure

```
/credit-wizard/
├── src/                    # Main Leverabase app
│   ├── pages/             # Page components
│   ├── components/        # Reusable components
│   ├── context/           # AppContext state
│   ├── hooks/             # Custom hooks
│   └── lib/               # Utilities (Supabase, auth)
├── bfllc-landing-page/    # benjaminfrostllc.com site
├── supabase/              # Edge functions & migrations
└── public/                # Static assets
```

---

## Related Repositories

- **Landing Page**: `/bfllc-landing-page/` → deployed to benjaminfrostllc.com
- **Main App**: `/` (this directory) → deployed to leverabase.com/app

---

## Important Notes

- The app was previously called "Credit Wizard" - always use **Leverabase** going forward
- Target audience: Entrepreneurs and small business owners building business credit
- Branding uses a fantasy/empowerment theme (Foundry, Treasury, Vault, Oracle)
- Dark mode UI with accent colors (vault-silver, vault-accent, vault-glow)

---

## Pricing Tiers (as of Jan 2026)

| Plan | Price | Features |
|------|-------|----------|
| Starter | $97/mo | Platform access, 7-stage journey, AI assistant, email support |
| Professional | $197/mo | + Bank integration, dispute management, monthly strategy call, priority support |
| Enterprise | $497/mo | + Weekly 1-on-1 coaching, done-for-you disputes, funding support, VIP Slack |

---

*Last updated: January 2026*
