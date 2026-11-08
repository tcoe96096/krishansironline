# Student mobile + password login (no SMS OTP)

## Approved implementation

The portal accepts an Indian mobile number and password in the student interface. The application normalizes the number to +91 format and converts it to a stable internal email-shaped identifier for Supabase Email/Password Auth.

- Supabase Email provider: enabled.
- Supabase Phone provider: **disabled**.
- SMS OTP: not used; no SMS provider or Twilio credentials are required.
- The generated identifier is not a real mailbox and cannot receive email confirmation or password-reset links.
- Mobile ownership is not verified during signup. A mobile number alone must not be treated as proof of identity.

## Supabase configuration

1. Keep Authentication → Sign In / Providers → Email enabled.
2. Keep Confirm email disabled for this specific synthetic-identifier flow.
3. Keep Authentication → Sign In / Providers → Phone disabled.
4. Require strong passwords and configure available rate limits / CAPTCHA protections.
5. Do not enable Phone Auth for this design. Enabling it would change the authentication model and may introduce OTP delivery or provider costs.

## Account recovery and safety

Because the generated identifier is not a real mailbox, ordinary email password-reset links will not reach students. Before production, implement a controlled recovery process that verifies a student's identity against school records through an authorized administrator. Never reset an account solely because someone knows or currently controls the unverified mobile number.

## Testing checklist

Test new registration, duplicate mobile number, valid and invalid passwords, sign-in, sign-out, session restoration, profile provisioning, and administrator-assisted recovery in a non-production test account. Confirm that no SMS is sent.

Never store passwords in localStorage or Google Sheets. Never expose Supabase service-role keys or provider secrets in frontend code or GitHub.

## Cost note

This flow does not incur per-login SMS OTP charges because it does not send SMS. Supabase project usage and any separately enabled paid features remain subject to the selected Supabase plan.
