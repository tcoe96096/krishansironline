# Supabase phone + password setup — Krishan Sir Online Learning Portal

## Approved login choice
- Students sign up and sign in using their 10-digit Indian mobile number and password.
- SMS OTP is not part of registration or login; no SMS provider is required.
- Supabase Phone Auth must be configured for password-based phone sign-in.
- Disable phone confirmation in Supabase Auth before enabling registration, otherwise Supabase may send a confirmation OTP and incur SMS charges.

## Supabase configuration
1. Open the existing Supabase project.
2. Go to Authentication → Providers → Phone and enable Phone provider.
3. Ensure phone confirmation is disabled for this password-only flow. Confirm the dashboard wording and behavior in a test account before production.
4. Set strong password requirements and configure CAPTCHA / rate limits where available.
5. Configure password recovery. Since phone numbers are not verified at signup, do not treat possession of the number as verified identity. For account recovery or changing a number, use a separately verified recovery process controlled by the project owner.
6. Test signup, duplicate number, correct password, wrong password, logout, session refresh and recovery. Confirm that no SMS is sent.

## Important security limitations
- A mobile number entered during signup is not proof that the student owns that number when phone confirmation is disabled.
- Mobile numbers can be recycled by carriers. Do not rely on an unverified phone number alone for sensitive account recovery.
- Never store passwords in localStorage or send them to Google Sheets.
- Use Supabase Auth persisted, refreshable sessions; never create a permanent client-side “logged in” flag.
- Keep service-role keys and all provider secrets out of frontend code and GitHub.

## No-SMS cost model
There is no per-login SMS charge because the chosen flow does not send OTP messages. Supabase project usage and any separately enabled paid features remain subject to the selected Supabase plan.
