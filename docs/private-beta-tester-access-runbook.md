---
title: "Relay Private Beta — Tester Access Runbook"
subtitle: "Owner checklist for safely onboarding and removing real test users"
date: "August 25, 2026"
---

# Relay Private Beta — Tester Access Runbook

**Owner checklist for safely onboarding and removing real test users**  
Last reviewed: August 25, 2026

## Current status

**CONTROLLED OWNER TESTING ONLY — NOT READY FOR EXTERNAL TESTERS YET.**

The application-side foundation and safeguards are merged into `main`. The separate Vercel project `relay-private-beta` received its first production deployment on August 25, 2026 at `https://relay-private-beta.vercel.app`. Its browser-safe production variables are configured, no service-role key is present, and automatic Git deployment remains deliberately disconnected while final owner tests are completed.

The configured Supabase backend passed its restored-backup rehearsal and live migration on August 24, 2026. The unrelated Auth user was removed, the two retained accounts are owner-controlled, both migrations applied successfully, and the fail-closed security audit passed. Public signup and anonymous sign-ins are disabled, email confirmation remains enabled, Relay Auth URLs are configured, and the Relay invitation/recovery templates are saved. The live login redirect and branding smoke test passed on August 25. Do not invite external testers until the two local test-account credentials are mapped to the retained users, the isolation test passes, the invitation/recovery flow is exercised, and billing is confirmed.

Do not invite an external tester until every item in the one-time launch checklist is complete.

### Intended access flow

**Public demo → Access request → Manual approval → Supabase invitation → Password setup → Private workspace → Testing period → Revoke and clean up**

There is no public signup and no shared demo password. Every tester receives a separate account and an isolated workspace.

### What is already automated

- Invitations are refused by the owner CLI unless the database readiness check passes and the user cap has room.
- New approved accounts receive an isolated personal workspace, owner membership, personnel profile, and fictional starter project after the migrations are applied.
- Database row quotas, content-length limits, and a 120-writes-per-minute account throttle are defined in the safeguard migration.
- Storage uses private buckets, strict MIME allowlists, small per-file limits, workspace paths, and object-count limits.
- Unsafe active/archive formats are rejected before upload.
- The owner CLI can report status, invite, ban, unban, and safely clean up an isolated tester. It refuses automatic cleanup of shared workspaces.
- `npm run private-beta:verify-isolation` verifies database and Storage separation using two controlled accounts.

## One-time launch checklist

Complete this once before accepting any real tester.

- [x] Back up `projtrack-portfolio` Supabase (`qdagzcivuddbztsybxfk`) database and Storage objects. Two verified backups were created August 23, 2026; the latest reflects the completed Auth-user review.
- [x] Restore the current post-review backup into a disposable PostgreSQL environment.
- [x] Apply both private-beta migrations to the restored disposable environment, in filename order.
- [x] Run `scripts/verify-private-beta-security.sql` successfully against the restored real-project backup.
- [x] Apply both migrations to a disposable synthetic baseline and verify fail-closed security plus automatic starter provisioning.
- [ ] Test two unrelated invited accounts and confirm neither can read, change, delete, subscribe to, download, or guess the other account's records and files. Blocked on August 25 because the two `TEST_USER_*` email/password pairs in `.env.private-beta.local` do not yet match the retained Auth users.
- [ ] Test two controlled accounts in one shared workspace if collaboration will be demonstrated.
- [ ] Resolve any migration, RLS, Storage, and strict-TypeScript failures without weakening the security checks.
- [x] Apply both verified migrations to `projtrack-portfolio` Supabase (`qdagzcivuddbztsybxfk`) only and pass the live fail-closed audit. Completed August 24, 2026; `GYG_ProjTrack's Project` (`qvoockauodrptvyqqqbe`) remained untouched.
- [x] Apply `202608240001_relay_branding.sql` after the product rename so newly invited users receive Relay starter text. Completed August 24, 2026.
- [x] Create the separate `relay-private-beta` Vercel project shell.
- [x] Set `NEXT_PUBLIC_DEMO_MODE=false` only on the private-beta production environment.
- [x] Configure only the private Supabase URL and publishable key on that deployment. No service-role key was added.
- [x] Deploy the verified `main` source to the private Vercel project. Completed through the Vercel CLI on August 25, 2026; Git remains intentionally disconnected until final owner tests pass.
- [x] In Supabase Auth, disable new-user signup and anonymous sign-ins; keep email confirmation enabled.
- [x] Set the Supabase Site URL to `https://relay-private-beta.vercel.app` and allow its exact `/auth/confirm` and `/auth/reset-password` redirects.
- [x] Save the Relay invitation and recovery email templates in Supabase.
- [ ] Send a controlled invitation and verify that it opens `/auth/confirm`, establishes a session, and sends the tester to `/auth/reset-password`.
- [x] Add conservative upload limits, MIME-type restrictions, per-workspace quotas, write throttling, a three-user CLI cap, and isolated-account cleanup tooling.
- [x] Add fictional starter-data onboarding for newly created workspaces.
- [x] Disable or block signup, debug, and test routes in live-backend mode.
- [ ] Invite and test your own account before inviting anyone else.
- [ ] Confirm both Supabase and Vercel organizations remain on free plans with no trial or paid add-on enabled.

### Owner commands after manual configuration

Copy `.env.private-beta.example` to the ignored `.env.private-beta.local` and fill it with the dedicated private-project values.

```powershell
npm run private-beta:admin -- status
npm run private-beta:verify-isolation
npm run private-beta:admin -- invite --email person@example.com --name "Person Name" --position "Project Manager"
npm run private-beta:admin -- ban --email person@example.com
npm run private-beta:admin -- cleanup --email person@example.com --confirm person@example.com
```

### Steps that always require owner judgment or dashboard access

- Decide whether a requester is legitimate and approve or reject them.
- Create and verify backups before applying a migration.
- Apply SQL through an authenticated Supabase database connection or SQL Editor when no Management API/CLI token and database password are available.
- Disable signup/anonymous access, set Auth URLs, and paste/test email templates in the Supabase dashboard.
- Review existing Auth users before opening an invitation slot. Completed August 23, 2026: one unrelated user removed and two owner accounts retained.
- Choose the public contact email used by the access-request link.
- Confirm the organization billing pages still show Free/Hobby with no trial or paid add-on.
- Decide whether to connect the private Vercel project to Git after final owner testing. The first production deployment was performed manually through the Vercel CLI so public-demo pushes cannot silently change the private beta.
- Review any shared-workspace cleanup manually; the CLI deliberately refuses to delete it.

## Checklist for each access request

### 1. Record the request

Tester name: ______________________________________

Tester email: _____________________________________

Reason for testing: ________________________________

Request date: _____________________________________

Planned access expiry: _____________________________

Collect only necessary information. Never ask the tester to send you a password.

### 2. Approve or reject manually

Approve only if:

- [ ] You recognize the requester or can verify their legitimate reason.
- [ ] They agree not to upload illegal, offensive, confidential, copyrighted, or malicious material.
- [ ] Their test has a defined purpose and expiry date, normally 7–14 days.
- [ ] Current Supabase and Vercel usage remains safely within free-plan limits.

For recruiters who only need to inspect your work, recommend the public browser-local demo first.

### 3. Send the invitation

1. Open the dedicated private Supabase project.
2. Go to **Authentication → Users**.
3. Select **Add user → Send invitation**.
4. Enter the approved email address.
5. Send the invitation and record the date below.

Invitation sent: __________________________________

Expected expiry: __________________________________

If the invitation expires, send a new invitation. Do not create or transmit a password for the tester.

### 4. Tester completes setup

The tester should:

1. Open the invitation email.
2. Follow the private-beta link.
3. Create a password containing at least eight characters, uppercase, lowercase, and a number.
4. Enter the application and confirm their profile.
5. Use only fictional or non-sensitive test content.

The database should automatically create a personal workspace, owner membership, and personnel record for the invited account.

### 5. Perform the owner smoke test

- [ ] Tester can sign in and sign out.
- [ ] Tester can update their profile.
- [ ] Tester can create, edit, and delete a project.
- [ ] Tester can create tasks and use the Gantt and calendar views.
- [ ] Tester can create reports/photos using permitted test files.
- [ ] Tester sees only their own workspace.
- [ ] Another unrelated account cannot see or change the tester's data.
- [ ] No service key, private URL, token, stack trace, or sensitive data appears in the browser or logs.

Workspace ID: _____________________________________

Smoke test completed: _____________________________

## Feature expectations

An isolated tester should be able to exercise projects, tasks, Gantt, calendar, reports, photos, personnel, profile, search, filters, and notifications.

True multi-user review or collaboration requires two controlled accounts in the same workspace. Do not place unrelated testers together merely to demonstrate collaboration. Shared-workspace permissions require an additional security review before uncontrolled external use.

Browser notifications, geolocation suggestions, and some device features may remain unavailable when the tester denies permission or when optional provider keys are not configured.

## Monitoring during access

- [ ] Check Supabase database, Storage, Auth, and Realtime usage periodically.
- [ ] Check Vercel bandwidth, function, and build usage periodically.
- [ ] Do not enable a paid trial, Pro plan, or paid protection add-on.
- [ ] Investigate unusual uploads, repeated writes, high request volume, or unexpected account activity.
- [ ] Immediately ban or disable a suspicious account before investigating or deleting data.

## Revoke and clean up

On the expiry date or after testing:

1. Ban or disable the Supabase Auth user immediately to stop new sessions.
2. Preserve only feedback or exports the tester explicitly asked to retain.
3. Remove the tester's private Storage objects.
4. Delete or archive their workspace data according to your retention decision.
5. Remove workspace memberships.
6. Delete the Auth user only after dependent workspace records have been handled.
7. Verify the old credentials and invitation link no longer provide access.
8. Record completion below.

Access revoked: ___________________________________

Data removed/retained: ____________________________

Cleanup verified by: ______________________________

## Fast troubleshooting

| Problem | Check first |
|---|---|
| Invitation never arrives | Supabase Auth logs, email address, email rate limits, spam folder, then resend the invitation |
| Link opens the wrong site | Supabase Site URL, redirect allowlist, and invitation email template |
| Link is expired or already used | Send a fresh invitation; never reuse or manually edit the token |
| User can sign in but sees no workspace | Provisioning trigger, `workspace_members`, personnel record, and migration status |
| User sees another tester's content | Disable access immediately and treat it as a security incident; inspect RLS before resuming tests |
| Upload fails | File size, MIME type, private bucket, workspace path, Storage RLS, and quota |
| Unexpected usage spike | Disable the involved account, inspect logs and usage, and keep paid upgrades disabled |

## Emergency rules

- Never put `SUPABASE_SERVICE_ROLE_KEY` in a `NEXT_PUBLIC_` variable or browser code.
- Never send a tester a shared owner/admin password.
- Never weaken RLS to make a failing feature work.
- Never place unrelated testers in the same workspace.
- If isolation fails, disable private-beta access for everyone until the cause is fixed and retested.

## Repository references

- `PRIVATE_BETA_AND_BACKUP_PLAN.md`
- `supabase/migrations/202608230001_private_beta_workspaces.sql`
- `supabase/migrations/202608230002_private_beta_safeguards.sql`
- `supabase/migrations/202608240001_relay_branding.sql`
- `scripts/verify-private-beta-security.sql`
- `scripts/private-beta-admin.mjs`
- `scripts/verify-private-beta-isolation.mjs`
- `.env.private-beta.example`
