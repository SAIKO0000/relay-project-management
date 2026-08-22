# Private beta email templates

These files are source-controlled references. Supabase does not automatically read them from the repository.

In the dedicated private-beta Supabase project:

1. Set **Authentication → URL Configuration → Site URL** to the exact private-beta production origin, without a trailing path.
2. Add the exact private-beta `/auth/confirm` and `/auth/reset-password` URLs to the redirect allowlist.
3. In **Authentication → Email Templates**, paste `invite.html` into **Invite user** and `recovery.html` into **Reset password**.
4. Send an invitation to an owner-controlled address and verify the link reaches `/auth/confirm`, establishes a session, and continues to `/auth/reset-password`.

Do not use the old public portfolio-demo wording for private user invitations.
