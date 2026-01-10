-- Credit Wizard - FINANCIAL ASCENT Task Seed Data
-- Run this AFTER supabase-schema.sql to populate task templates

-- Clear existing task templates (optional - remove if you want to preserve existing)
-- TRUNCATE task_templates CASCADE;

-- ============================================
-- FOUNDRY - Entity Creation & Legal Foundation
-- ============================================
INSERT INTO task_templates (id, section, title, description, tips, resources, order_index) VALUES
('foundry_1', 'foundry', 'Choose Business Name', 'Research your desired name on your state''s business registry and do a trademark search. Ensure a suitable domain is available.', 'Check trademark availability at USPTO and domain availability before finalizing.', '[{"label": "State Business Registry", "url": "https://www.e-secretaryofstate.com"}, {"label": "USPTO Trademark Search", "url": "https://www.uspto.gov/trademarks/search"}]', 1),
('foundry_2', 'foundry', 'Obtain Registered Agent', 'Get a registered agent for privacy protection and compliance. Shields your personal address from public records.', 'I personally recommend ZenBusiness. You don''t have to purchase upsells - just the basic service.', '[{"label": "ZenBusiness", "url": "https://www.zenbusiness.com"}]', 2),
('foundry_3', 'foundry', 'Get Physical Business Address', 'Obtain a real street address (not PO Box). For privacy and credibility, use a virtual office.', 'Regus virtual office recommended. Call (800) 633-4237 for discounts. Speak to a rep for best pricing.', '[{"label": "Regus Virtual Office", "url": "https://www.regus.com/en-gb/virtual-offices"}]', 3),
('foundry_4', 'foundry', 'Register LLC/Corporation', 'File formation documents through your Secretary of State. LLCs are popular for simplicity and liability protection.', 'Free with funding package or use Incfile/LegalZoom. Have your business name, address, and payment ready.', '[{"label": "Incfile", "url": "https://www.incfile.com"}, {"label": "LegalZoom", "url": "https://www.legalzoom.com"}]', 4),
('foundry_5', 'foundry', 'Obtain EIN', 'Apply for your Employer Identification Number at IRS.gov - it''s free and takes minutes. Save the confirmation letter!', 'An EIN is like a social security number for your business. You''ll need it for bank accounts and credit applications.', '[{"label": "IRS EIN Application", "url": "https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online"}]', 5),
('foundry_6', 'foundry', 'Get Business Phone (800 Number)', 'Get a dedicated 800 business number for professional credibility.', 'Use code 0SETUP at Kall8 for discount on setup fees.', '[{"label": "Kall8", "url": "https://signup.kall8.com/?promocode=NOFEE1"}]', 6),
('foundry_7', 'foundry', 'Find NAICS Code', 'Identify your 6-digit industry classification code. Lenders often ask for this.', 'Use consulting/marketing code (541613) - it''s viewed as low-risk by lenders. Avoid real estate as it''s high-risk.', '[{"label": "NAICS Lookup", "url": "https://www.naics.com"}]', 7),
('foundry_8', 'foundry', 'Obtain Business License', 'Check if your city/county/state requires a general business license or industry-specific permits.', 'Requirements vary by location and industry. Check your local county clerk''s website.', '[{"label": "SBA License Lookup", "url": "https://www.sba.gov/business-guide/launch-your-business/apply-licenses-permits"}]', 8),
('foundry_9', 'foundry', 'Draft Operating Agreement', 'Create and sign your LLC operating agreement outlining ownership and operations.', 'Required in most states. Outlines member responsibilities, profit sharing, and decision-making processes.', '[]', 9);

-- ============================================
-- IDENTITY - Credit Identity & Online Presence
-- ============================================
INSERT INTO task_templates (id, section, title, description, tips, resources, order_index) VALUES
('identity_1', 'identity', 'Obtain D-U-N-S Number', 'Apply for free D-U-N-S at dnb.com. Essential for your D&B business credit file.', 'D&B may call to upsell credit monitoring - purchasing is NOT required. Just politely decline.', '[{"label": "D&B D-U-N-S Application", "url": "https://www.dnb.com/duns-number.html"}]', 1),
('identity_2', 'identity', 'Register with Experian Business', 'Create your Experian Business credit profile.', 'Your business credit is separate from personal credit. Start building it early.', '[{"label": "Experian Business", "url": "https://smallbusiness.experian.com"}]', 2),
('identity_3', 'identity', 'Register with Equifax Business', 'Set up your Equifax Business credit profile.', 'Having profiles with all three bureaus gives lenders a complete picture.', '[{"label": "Equifax Business", "url": "https://www.equifax.com/business/product/business-credit-reports-small-business/"}]', 3),
('identity_4', 'identity', 'Register Domain Name', 'Purchase yourbusiness.com domain. Use Namecheap or GoDaddy ($10-15/year).', 'A custom domain makes your business look serious and established.', '[{"label": "Namecheap", "url": "https://www.namecheap.com"}, {"label": "GoDaddy", "url": "https://www.godaddy.com"}]', 4),
('identity_5', 'identity', 'Set Up Business Email', 'Create yourname@yourbusiness.com using Google Workspace or Microsoft 365 (~$6/month).', 'Ditch the generic Gmail/Yahoo. A professional email looks far more credible on applications.', '[{"label": "Google Workspace", "url": "https://workspace.google.com"}]', 5),
('identity_6', 'identity', 'Create Business Logo', 'Get a professional logo from Fiverr ($5-50). Use consistently across all platforms.', 'A logo solidifies your brand identity and makes you look more legitimate.', '[{"label": "Fiverr", "url": "https://www.fiverr.com"}]', 6),
('identity_7', 'identity', 'Build Business Website', 'Create at least a one-page site with company overview, contact info, and services.', 'Lenders WILL Google your business. A professional website confirms legitimacy.', '[{"label": "Wix", "url": "https://www.wix.com"}, {"label": "Squarespace", "url": "https://www.squarespace.com"}]', 7),
('identity_8', 'identity', 'Google Business Profile', 'Claim and verify your Google Business listing. Google will mail a verification postcard.', 'This lets you appear on Google Maps and search results with your business info.', '[{"label": "Google Business", "url": "https://business.google.com"}]', 8),
('identity_9', 'identity', 'Register with 411 Directory', 'Add your business to 411 at ListYourself.net (free). Lenders verify businesses this way.', 'Many VoIP providers don''t automatically list numbers. Do it yourself. Takes a few weeks to show up.', '[{"label": "ListYourself", "url": "https://www.listyourself.net"}]', 9),
('identity_10', 'identity', 'Yelp Business Page', 'Claim and complete your Yelp business profile with consistent NAP info.', 'Ensure NAP (Name, Address, Phone) is identical across ALL listings.', '[{"label": "Yelp for Business", "url": "https://biz.yelp.com"}]', 10),
('identity_11', 'identity', 'Bing Places Listing', 'Create your Bing Places business listing for additional visibility.', 'Bing is the second largest search engine. Don''t neglect it.', '[{"label": "Bing Places", "url": "https://www.bingplaces.com"}]', 11),
('identity_12', 'identity', 'Facebook Business Page', 'Create a Facebook Page with your logo, description, and contact info.', 'You don''t have to post daily, but having the profile adds legitimacy.', '[{"label": "Facebook Business", "url": "https://www.facebook.com/business"}]', 12),
('identity_13', 'identity', 'LinkedIn Company Page', 'Create a LinkedIn Company Page for professional networking presence.', 'LinkedIn is essential for B2B credibility and networking.', '[{"label": "LinkedIn Pages", "url": "https://www.linkedin.com/company/setup/new/"}]', 13);

-- ============================================
-- TREASURY - Banking & Capital Custody
-- ============================================
-- Chase
INSERT INTO task_templates (id, section, title, description, tips, resources, order_index) VALUES
('treasury_chase_1', 'treasury', 'Chase - Personal Checking', 'Open Chase personal checking ($50 min deposit).', 'Chase relationship banking is key to unlocking business lines and larger credit cards.', '[]', 1),
('treasury_chase_2', 'treasury', 'Chase - Personal Savings', 'Open Chase personal savings ($50 min deposit).', 'Building a relationship with Chase is essential for prime-tier funding.', '[]', 2),
('treasury_chase_3', 'treasury', 'Chase - Business Checking', 'Open Chase business checking ($50 min deposit). Requires EIN & LLC docs.', 'Prioritize Chase early in your journey.', '[]', 3),
('treasury_chase_4', 'treasury', 'Chase - Business Savings', 'Open Chase business savings ($50 min deposit).', 'Complete all four account types for maximum relationship value.', '[]', 4),
-- Bank of America
('treasury_bofa_1', 'treasury', 'Bank of America - Personal Checking', 'Open BofA personal checking.', 'Strong business credit reporting partner.', '[]', 5),
('treasury_bofa_2', 'treasury', 'Bank of America - Personal Savings', 'Open BofA personal savings.', 'BofA offers secured business cards good for early-stage builders.', '[]', 6),
('treasury_bofa_3', 'treasury', 'Bank of America - Business Checking', 'Open BofA business checking.', 'Reports to business credit bureaus.', '[]', 7),
('treasury_bofa_4', 'treasury', 'Bank of America - Business Savings', 'Open BofA business savings.', 'Build the full relationship with all account types.', '[]', 8),
-- Wells Fargo
('treasury_wells_1', 'treasury', 'Wells Fargo - Personal Checking', 'Open Wells Fargo personal checking.', 'Conservative bank. Good for stability.', '[]', 9),
('treasury_wells_2', 'treasury', 'Wells Fargo - Personal Savings', 'Open Wells Fargo personal savings.', 'Good for relationship banking later in your journey.', '[]', 10),
('treasury_wells_3', 'treasury', 'Wells Fargo - Business Checking', 'Open Wells Fargo business checking.', 'Solid option for business banking.', '[]', 11),
('treasury_wells_4', 'treasury', 'Wells Fargo - Business Savings', 'Open Wells Fargo business savings.', 'Complete the full relationship.', '[]', 12),
-- Citi
('treasury_citi_1', 'treasury', 'Citi - Personal Checking', 'Open Citi personal checking.', 'Good for accessing Citi Business Credit Cards.', '[]', 13),
('treasury_citi_2', 'treasury', 'Citi - Personal Savings', 'Open Citi personal savings.', 'International-friendly for scaling beyond U.S.', '[]', 14),
('treasury_citi_3', 'treasury', 'Citi - Business Checking', 'Open Citi business checking.', 'Great for international business needs.', '[]', 15),
('treasury_citi_4', 'treasury', 'Citi - Business Savings', 'Open Citi business savings.', 'Build the full Citi relationship.', '[]', 16),
-- US Bank
('treasury_usbank_1', 'treasury', 'US Bank - Personal Checking', 'Open US Bank personal checking.', 'Great for regional funding strategies.', '[]', 17),
('treasury_usbank_2', 'treasury', 'US Bank - Personal Savings', 'Open US Bank personal savings.', 'Moderate approval standards.', '[]', 18),
('treasury_usbank_3', 'treasury', 'US Bank - Business Checking', 'Open US Bank business checking.', 'Good regional bank option.', '[]', 19),
('treasury_usbank_4', 'treasury', 'US Bank - Business Savings', 'Open US Bank business savings.', 'Complete the relationship.', '[]', 20),
-- PNC
('treasury_pnc_1', 'treasury', 'PNC Bank - Personal Checking', 'Open PNC personal checking.', 'Known for regional relationship banking.', '[]', 21),
('treasury_pnc_2', 'treasury', 'PNC Bank - Personal Savings', 'Open PNC personal savings.', 'Can unlock funding with steady business activity.', '[]', 22),
('treasury_pnc_3', 'treasury', 'PNC Bank - Business Checking', 'Open PNC business checking.', 'Strong regional presence.', '[]', 23),
('treasury_pnc_4', 'treasury', 'PNC Bank - Business Savings', 'Open PNC business savings.', 'Build the full relationship.', '[]', 24),
-- Credit Unions
('treasury_acc_1', 'treasury', 'Join American Consumer Council', 'Sign up at americanconsumercouncil.org - Use code "Andrews" for free membership.', 'ACC membership unlocks access to many credit unions with better rates and terms.', '[{"label": "ACC Membership", "url": "https://www.americanconsumercouncil.org/membership.asp"}]', 25),
('treasury_navyfed_1', 'treasury', 'Navy Federal - Personal Checking', 'Open Navy Federal accounts if military affiliated.', 'Known for aggressive high-limit approvals once internal score is built.', '[{"label": "Navy Federal", "url": "https://www.navyfederal.org"}]', 26),
('treasury_navyfed_2', 'treasury', 'Navy Federal - Business Checking', 'Open Navy Federal business accounts.', 'Amazing business product lineup over time.', '[]', 27),
('treasury_penfed_1', 'treasury', 'PenFed - Personal Checking', 'Open PenFed accounts.', 'Open to all with small donation if no military background.', '[{"label": "PenFed", "url": "https://www.penfed.org"}]', 28),
('treasury_penfed_2', 'treasury', 'PenFed - Business Checking', 'Open PenFed business accounts.', 'Good mix of personal and business lending.', '[]', 29),
('treasury_nasafcu_1', 'treasury', 'NASA FCU - Personal Checking', 'Open NASA FCU accounts.', 'Tech/science/engineering professional perks.', '[{"label": "NASA FCU", "url": "https://www.nasafcu.com"}]', 30),
('treasury_nasafcu_2', 'treasury', 'NASA FCU - Business Checking', 'Open NASA FCU business accounts.', 'Unique business lines available after relationship builds.', '[]', 31);

-- ============================================
-- CREDIT CORE - Credit Infrastructure & Expansion
-- ============================================
INSERT INTO task_templates (id, section, title, description, tips, resources, order_index) VALUES
('creditcore_1', 'credit_core', 'Set Up Nav Monitoring', 'Use Nav.com to monitor D&B, Experian, and Equifax business credit in one place.', 'Nav''s paid plans will report a tradeline on your behalf, further building credit.', '[{"label": "Nav.com", "url": "https://www.nav.com"}]', 1),
('creditcore_2', 'credit_core', 'Sign Up for D&B CreditSignal', 'Get free alerts when your D&B scores change.', 'Monitor your PAYDEX and other D&B ratings for changes.', '[{"label": "D&B CreditSignal", "url": "https://www.dnb.com/products/small-business/creditsignal.html"}]', 2),
('creditcore_3', 'credit_core', 'Net-30: Uline', 'Open Uline Net-30 account (shipping/office supplies). Reports to D&B.', 'Common easy-approval vendor. Order products you need and pay on time.', '[{"label": "Uline", "url": "https://www.uline.com"}]', 3),
('creditcore_4', 'credit_core', 'Net-30: Quill', 'Open Quill Net-30 account (office supplies). Reports to business bureaus.', 'Start with small orders. Request Net-30 terms after a few purchases.', '[{"label": "Quill", "url": "https://www.quill.com"}]', 4),
('creditcore_5', 'credit_core', 'Net-30: Grainger', 'Open Grainger Net-30 account (industrial supplies). Reports to D&B.', 'Industrial supplies vendor. Good for building tradelines.', '[{"label": "Grainger", "url": "https://www.grainger.com"}]', 5),
('creditcore_6', 'credit_core', 'Net-30: Account #4', 'Open fourth Net-30 vendor account that reports to bureaus.', 'Research vendors in your industry that report to business credit bureaus.', '[]', 6),
('creditcore_7', 'credit_core', 'Net-30: Account #5', 'Open fifth Net-30 vendor account that reports to bureaus.', 'Aim for 5+ Net-30 accounts reporting for strongest credit profile.', '[]', 7),
('creditcore_8', 'credit_core', 'Business Credit Card #1', 'Apply for first business credit card (secured if needed).', 'Start with secured cards if needed. Graduate to unsecured after building history.', '[]', 8),
('creditcore_9', 'credit_core', 'Business Credit Card #2', 'Apply for second revolving business credit account.', 'Multiple cards diversify your credit mix and increase total available credit.', '[]', 9),
('creditcore_10', 'credit_core', 'Pledge/Secured Loan', 'Apply for a pledge loan or secured loan from a credit union.', 'Installment loans help diversify your credit mix beyond revolving credit.', '[]', 10),
('creditcore_11', 'credit_core', 'Authorized User Tradelines', 'Add 2-3 authorized user tradelines with high limits and good history.', 'Authorized user tradelines can boost your credit profile quickly.', '[]', 11),
('creditcore_12', 'credit_core', 'Achieve 80 PAYDEX Score', 'Build to 80+ PAYDEX by paying all Net-30 accounts on time or early.', '80 PAYDEX means you pay on time. 100 means you pay 30+ days early.', '[]', 12),
('creditcore_13', 'credit_core', 'Achieve 75+ Experian Business', 'Build Experian Business score above 75.', 'Experian Business scores range from 1-100. 75+ is considered good.', '[]', 13),
('creditcore_14', 'credit_core', 'Reach 11 Total Credit Lines', 'Build to 11 total credit accounts (revolving + installment + vendor).', 'Credit mix and number of accounts affect your overall creditworthiness.', '[]', 14);

-- ============================================
-- CONTROL - Risk, Performance & Optimization
-- ============================================
INSERT INTO task_templates (id, section, title, description, tips, resources, order_index) VALUES
('control_1', 'control', 'Keep Utilization Under 30%', 'Maintain credit card balances below 30% of your credit limits at all times.', 'Lower utilization = higher scores. Aim for under 10% for best results.', '[]', 1),
('control_2', 'control', 'Pay Balances Early/Full', 'Pay credit card balances in full or before statement closes when possible.', 'Paying before statement close reports $0 balance to bureaus.', '[]', 2),
('control_3', 'control', 'Set Payment Reminders', 'Set up automatic payments or reminders to never miss a due date.', 'Payment history is the most important factor in your credit score.', '[]', 3),
('control_4', 'control', 'Keep Old Accounts Open', 'Maintain older accounts to extend your credit history length.', 'Average age of accounts matters. Don''t close old cards.', '[]', 4),
('control_5', 'control', 'Monitor Credit Reports Regularly', 'Check all three bureaus monthly for accuracy and updates.', 'Errors can hurt your score. Dispute any inaccuracies immediately.', '[]', 5),
('control_6', 'control', 'Gradually Increase Credit Limits', 'Request credit limit increases every 6-12 months.', 'Higher limits with same spending = lower utilization ratio.', '[]', 6);

-- ============================================
-- COMMAND - Monitoring, Compliance & Longevity
-- ============================================
INSERT INTO task_templates (id, section, title, description, tips, resources, order_index) VALUES
('command_1', 'command', 'Use Nav Monitoring Tool', 'Maintain active Nav.com subscription for ongoing business credit monitoring.', 'Continuous monitoring catches issues early.', '[{"label": "Nav.com", "url": "https://www.nav.com"}]', 1),
('command_2', 'command', 'Keep Financial Statements Updated', 'Maintain current P&L and balance sheet for lender requests.', 'Lenders may request financials for larger credit lines.', '[]', 2),
('command_3', 'command', 'Stay Current with Tax Filings', 'File all business taxes on time and keep records organized.', 'Tax compliance is essential for maintaining good standing.', '[]', 3),
('command_4', 'command', 'Show Consistent Revenue', 'Demonstrate consistent or growing revenue to show business stability.', 'Revenue trends affect lending decisions. Keep good records.', '[]', 4),
('command_5', 'command', 'Annual Report Filings', 'File required annual reports with your state to maintain good standing.', 'Missing annual reports can dissolve your LLC.', '[]', 5),
('command_6', 'command', 'License Renewals', 'Track and renew all business licenses and permits before expiration.', 'Set calendar reminders for renewal deadlines.', '[]', 6);

-- ============================================
-- THE VAULT - Document Upload (Reference only)
-- ============================================
INSERT INTO task_templates (id, section, title, description, tips, resources, order_index) VALUES
('vault_id', 'the_vault', 'Government-Issued ID', 'Upload a clear photo of your ID (front and back). Accepted: Driver''s license, State ID, or Passport.', 'Ensure text is clearly readable in the image.', '[]', 1),
('vault_ssn', 'the_vault', 'Social Security Card', 'Upload your Social Security card. Required for identity verification.', 'Keep this document secure. Only upload to trusted platforms.', '[]', 2),
('vault_address', 'the_vault', 'Proof of Address', 'Upload a utility bill or bank statement dated within the last 60 days showing your current address.', 'Must be dated within 60 days and show your current address.', '[]', 3),
('vault_ein', 'the_vault', 'EIN Confirmation Letter', 'Upload your IRS EIN confirmation letter (CP 575 or 147C). Required for business credit applications.', 'Save this letter - you''ll use it for many applications.', '[]', 4),
('vault_llc', 'the_vault', 'LLC Formation Documents', 'Upload your Articles of Organization or Certificate of Formation from your state.', 'This proves your business is legally registered.', '[]', 5),
('vault_operating', 'the_vault', 'Operating Agreement', 'Upload your signed LLC Operating Agreement outlining ownership and operations.', 'Required by most states for LLCs.', '[]', 6),
('vault_license', 'the_vault', 'Business License', 'Upload your business license or permit if applicable to your industry.', 'Not all businesses require a license. Check your local requirements.', '[]', 7);

-- ============================================
-- SURVEY QUESTIONS
-- ============================================
INSERT INTO survey_questions (id, section, question, options, order_index) VALUES
('survey_treasury_military', 'treasury', 'Do you or a family member have military affiliation?', '[{"value": "yes", "label": "Yes, I or a family member served"}, {"value": "no", "label": "No military affiliation"}]', 1),
('survey_treasury_existing', 'treasury', 'Do you have existing business bank accounts?', '[{"value": "yes", "label": "Yes, I have business accounts"}, {"value": "no", "label": "No, starting fresh"}]', 2),
('survey_identity_website', 'identity', 'Do you already have a business website?', '[{"value": "yes", "label": "Yes, I have a website"}, {"value": "no", "label": "No website yet"}]', 1),
('survey_identity_social', 'identity', 'Which social media platforms do you plan to use?', '[{"value": "all", "label": "All major platforms"}, {"value": "some", "label": "Just a few"}, {"value": "none", "label": "None for now"}]', 2),
('survey_creditcore_cards', 'credit_core', 'Do you have existing business credit cards?', '[{"value": "yes", "label": "Yes, I have business cards"}, {"value": "no", "label": "No business cards yet"}]', 1);

-- Success message
SELECT 'Task templates and survey questions seeded successfully!' as status;
