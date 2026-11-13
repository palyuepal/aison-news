# Brevo daily newsletter setup

The Brevo sender workflow is deliberately gated. It sends only after the GitHub Pages deployment for a push to `main` succeeds and all always-on same-commit editorial checks succeed:

- Validate AIson V3
- Validate AIson Deep Read Quality
- Validate AIson Trust Layer
- Validate AIson Search Quality
- Validate AIson PWA Return Experience

The workflow fails closed when a check fails or does not finish within 15 minutes. It sends only an edition dated for the current Hong Kong calendar day. Campaigns use a date-based name so reruns do not send duplicates; an existing draft campaign is resumed, while any other existing status is left untouched.

## Required GitHub configuration

In repository Settings → Secrets and variables → Actions:

- Add secret `BREVO_API_KEY`.
- Add variable `BREVO_LIST_ID` with the numeric ID of the list containing active, opted-in AIson newsletter subscribers.
- Add variable `BREVO_SENDER_EMAIL` with a sender address verified in Brevo.
- Optionally add variable `BREVO_SENDER_NAME` (defaults to `AIson`).

Do not enable sending until the opted-in subscribers are in the Brevo list and the sender is verified. Brevo's campaign unsubscribe placeholder is included in the email footer.

## Signup form status

The website signup form still uses Beehiiv. This integration does not import contacts or replace that form. Until the site form is migrated to a Brevo form, new website subscribers will continue to enter Beehiiv rather than the Brevo list.
