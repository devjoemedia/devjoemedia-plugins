# Content rules: every claim must be true

Printed collateral gets handed to customers, partners and investors, and nobody can patch it after printing.
A wrong phone number or an invented "10,000+ users" is far worse in print than on a web page. So the copy comes from evidence, and gaps are reported rather than filled.

## Build a fact sheet first

Before writing any layout, produce `fact-sheet.md` in the work directory. Delegate the code sweep to a subagent if you can, since it touches many files. Cite a source for every line, as a file path or URL:

1. **Positioning**: product name, legal/parent name (footer copyright), SEO title/description, hero slide copy, About page text, app-store blurb, onboarding screens.
2. **Pillars / modules**: user-facing labels and what each lets you do, with real category examples.
3. **Creation flows**: what users can post or create, and the wizard steps with their exact labels.
4. **Buyer / end-user features**: search, filters, saved items, messaging, reviews, notifications.
5. **Business features**: stores, plans (tier names only unless prices are hardcoded), roles, promotions, verification, integrations.
6. **Account & trust**: sign-up methods, verification, privacy controls, security checks, policies.
7. **Payments**: methods and providers actually integrated.
8. **Contact**: website, support email, phone/WhatsApp, social handles, store links, address.
9. **Numbers**: every stat that appears in the UI, marked *live*, *hardcoded marketing*, or *fallback*.
10. **Flags**: contradictions, features behind disabled flags, typos in user-facing copy, and anything missing.

Live pages are also good sources. Run `shoot.mjs --text` on the About, FAQ and landing pages to capture the product's own voice.

## Rules while writing

- **Use the product's own words** for headlines when they're good (hero lines, About-page beliefs). Rewrite for brevity, but keep the meaning.
- **No invented numbers.** Use countable facts instead ("5 listing types", "3 platforms", "Free to join"). Hardcoded marketing stats and small live stats (e.g. "584 monthly visitors") stay out unless the user asks for them.
- **No features behind disabled flags** or marked "coming soon", unless the piece is explicitly a roadmap.
- **No contact details you didn't find.** If there's no phone number, leave it out and list it as a gap. Never use fixture or test data (seed phone numbers, `example.com`).
- **Prices only if verified.** Plan tiers can be named. Prices come from the user or a live pricing page.
- **Soften what you can't prove.** "Payments are processed by Paystack" is evidenced. "We never store your card" isn't, unless the code or policy says so.
- **Banned filler:** "streamline your workflow", "all-in-one solution", "seamless experience", "cutting-edge". Say what the product does, in concrete terms.
- **Benefit-first headlines** ("Check before you buy") and feature-specific body text ("Free VIN decode, price checks, import-duty estimates").
- **Bold the UI labels** in step instructions (Tap **Post**, choose **Create account**) so readers can match them to the screen.

## The gap report

End every delivery with a short list the user must confirm before printing:
- missing contact details (phone, address, iOS app link …)
- contradictions found (two support emails, three sets of social handles …)
- claims you inferred rather than read (role descriptions, "how-to videos on YouTube")
- features deliberately left out, and why (behind a flag, coming soon)
