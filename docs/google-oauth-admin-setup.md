# Google OAuth and Admin account setup

This project uses Supabase Auth for Google sign-in. A Google sign-in alone does **not** grant administrator access. Admin authorization is checked against `public.user_roles` on every authenticated session.

## Supabase Google provider

1. In Google Cloud Console, create or select an OAuth 2.0 Web application client.
2. Add the Supabase callback URL below as an **Authorized redirect URI**:
   `https://vsqwlkqqsxcehvdsdbna.supabase.co/auth/v1/callback`
3. In Supabase Dashboard → Authentication → Providers → Google, enable Google and enter the OAuth Client ID and Client Secret.
4. In Supabase Dashboard → Authentication → URL Configuration, set the production Site URL to the approved website origin and add the Preview origin to Redirect URLs if Preview sign-in is required.
5. Keep the OAuth client secret only in Google Cloud/Supabase dashboard. Never place it in GitHub, frontend environment variables, SQL files, or chat.

## Admin grant

The repository contains `supabase/bootstrap/001_add_approved_admin.sql`. It is deliberately a manual, one-time bootstrap script. It grants the `admin` role only to the exact owner-approved email after that identity has signed in through Google and Supabase confirms the email and Google provider.

Before running it:
- Confirm the exact Google email with the owner.
- Confirm that this identity appears in Supabase Auth with Google as its provider and a confirmed email.
- Confirm the `user_roles` table and its unique key are present.
- Keep a record of the change.

Do not grant admin based only on user-editable metadata, a mobile number, or an unverified email. Do not promote an existing student account unless the owner explicitly confirms that exact Google identity.

## Current implementation boundary

The frontend currently exposes a Google sign-in button labelled for Admin Login and reads `user_roles` to determine `isAdmin`. The Admin role is not yet provisioned in the database. A Google OAuth button is not proof that Google OAuth is configured; test the full redirect and callback after the provider is enabled.

Student mobile/password login uses synthetic email identifiers and does not use SMS OTP. Normal email password recovery is not available for those synthetic addresses; implement an identity-verified Admin-assisted recovery process before production launch.
