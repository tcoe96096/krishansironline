# Supabase SMS OTP setup — Krishan Sir Online Learning Portal

This guide is for the existing Supabase project. Do not paste provider credentials into GitHub, Vite variables, chat, or the website.

## Current decision
- Student login: mobile OTP + phone/password.
- SMS provider: not selected/configured yet.
- Country: India. Check current TRAI/DLT requirements with the chosen SMS provider before sending production OTPs.

## Supported provider options
Supabase hosted Phone Auth currently documents Twilio, MessageBird, and Vonage; Textlocal is listed as community-supported in the Phone Login guide. Provider availability, account onboarding and India delivery rules can change. Compare sender/route support and DLT onboarding before choosing.

Official guide: https://supabase.com/docs/guides/auth/phone-login

## Configure the existing Supabase project
1. Open Supabase Dashboard and select the existing portal project.
2. Go to Authentication → Providers (or Sign In / Providers, depending on dashboard layout) → Phone.
3. Enable Phone provider, but do not announce OTP login as live until delivery is tested.
4. Create an account with the selected SMS provider and complete its required sender-ID, template and India DLT registration steps.
5. In Supabase Phone provider settings, choose that provider and enter its credentials directly in the dashboard. Never commit these credentials.
6. In Authentication → Templates, set a concise OTP template containing the Supabase code variable, e.g. 'Your Krishan Sir Portal verification code is {{ .Code }}. Do not share it.'
7. Set conservative OTP request limits, CAPTCHA/bot protection and expiry. Supabase documents a default 60-second resend interval; verify the live project's settings.
8. Add a test phone number with a fixed test OTP only for controlled development. Remove test numbers/codes before production.
9. Test delivery to at least two Indian mobile networks, then test wrong code, expired code, resend cooldown and repeated requests.

## India-specific compliance checks
- Confirm DLT entity/principal-entity registration, sender/header, content template and applicable route with the provider.
- Confirm whether OTP traffic requires a specific transactional/service route and approved template.
- Do not assume an international provider account alone guarantees India delivery or compliance.

## Credentials checklist (keep values private)
- [ ] Provider account created
- [ ] India delivery supported and DLT onboarding confirmed
- [ ] Sender/header and OTP template approved
- [ ] Provider API credentials entered in Supabase dashboard
- [ ] Phone provider enabled
- [ ] CAPTCHA and OTP rate limits configured
- [ ] Real-device OTP delivery tested
- [ ] Test phone numbers/codes removed for production

## Important account-safety note
Phone numbers can be recycled by mobile carriers. For accounts that use phone + password, require fresh phone verification for recovery or phone-number changes and consider MFA before allowing sensitive account changes.
