# Relay Deployment Modes and Backup Plan

Last reviewed: August 24, 2026

## Implementation status

The application and migration foundation is merged into `main`. The separate Vercel project `relay-private-beta` received its first production deployment on August 25, 2026 at `https://relay-private-beta.vercel.app`, with browser-safe production variables only and no service-role key. Automatic Git deployment remains intentionally disconnected while final owner testing is completed, so an unrelated `main` push cannot silently change the live-backend deployment.

The live backend now has two owner-controlled Auth users, six hardened private buckets, tenant workspaces, quotas, write guards, and a passing readiness RPC. The unrelated third Auth user was removed after owner review. Relay Auth URLs and invitation/recovery templates are configured, and the deployed login/redirect smoke test passes. The two-account runtime test passed database and private Storage isolation on August 25, 2026, and its cleanup audit found no temporary rows or files. Do not invite external users until the invitation/recovery flow is exercised and both billing dashboards are confirmed.

Local SQL validation is complete. Both migrations apply cleanly to a disposable synthetic baseline, and a newly inserted Auth user receives exactly one isolated workspace with one fictional starter project, two tasks, and one event. A second rehearsal restored the current real `qdagzcivuddbztsybxfk` database backup into a disposable PostgreSQL instance, preserved both owner Auth users and all public application rows, applied both migrations, and passed `scripts/verify-private-beta-security.sql`. Both migrations, the fail-closed audit, and the follow-up Relay branding migration subsequently passed on the live Supabase project on August 24, 2026.

Two pre-migration logical backups of `qdagzcivuddbztsybxfk` were completed and independently verified on August 23, 2026. The latest backup was taken after Auth review and contains the two retained owner accounts, roles, schema, public application data, all six current Storage objects across three buckets, and a SHA-256 manifest in the owner-only Documents backup folder. Supabase Auth passwords are not recoverable from this logical backup.

- `supabase/migrations/202608230001_private_beta_workspaces.sql` creates personal workspaces, membership roles, automatic invited-user provisioning, non-null tenant keys, workspace RLS, private Storage buckets, workspace/user-scoped object policies, and security-invoker views.
- Next.js 16 now uses `@supabase/ssr` cookie sessions in live-backend mode. The deprecated `@supabase/auth-helpers-nextjs` dependency was removed.
- `proxy.ts` verifies private sessions with `getUser()`, protects application pages, and redirects the legacy signup page to the invitation-only login.
- API routes that read or mutate user data use a caller-scoped Supabase client so RLS applies to their queries.
- New reports, photos, attachments, and avatars use private workspace/user paths and signed URLs instead of permanent public URLs.
- `scripts/verify-private-beta-security.sql` fails when a tenant table lacks RLS/non-null workspace ownership, a broad/anonymous policy remains, an application bucket is public, or an exposed view bypasses RLS.
- `supabase/migrations/202608230002_private_beta_safeguards.sql` adds row quotas, write throttling, content limits, safe starter content, stricter private Storage limits, and a service-role-only readiness RPC.
- `supabase/migrations/202608240001_relay_branding.sql` updates the user-visible starter project text without rewriting the two migrations already applied to the live database.
- `scripts/private-beta-admin.mjs` provides readiness-gated invitation, ban, and isolated-account cleanup commands with a default three-user cap.
- `scripts/verify-private-beta-isolation.mjs` verifies two-account database and Storage isolation after deployment.

The public demo and private beta use the same reviewed `main` source with different deployment variables. The public project uses `NEXT_PUBLIC_DEMO_MODE=true` and browser-local fictional data; the private project uses `NEXT_PUBLIC_DEMO_MODE=false` and invite-only Supabase authentication.

### Required validation before any remote change

1. Export the `projtrack-portfolio` Supabase project (`qdagzcivuddbztsybxfk`) database and Storage objects.
2. Restore the export into a disposable/local Supabase environment.
3. Apply the workspace migration there first. A migration error rolls the transaction back; do not weaken the failing check to force it through.
4. Run `scripts/verify-private-beta-security.sql`.
5. Test with two unrelated invited accounts: each must receive a different default workspace and must be unable to read, update, delete, subscribe to, download, or guess the other account's rows/files.
6. Test two controlled accounts in one deliberately shared workspace to verify collaboration.
7. Regenerate `lib/supabase.types.ts` from the migrated schema and resolve the repository's existing strict-TypeScript debt before treating the beta as production-grade.

Only after those checks pass should the migration be applied to the candidate private project and a second Vercel project be created.

## Decision

Keep one repository and one maintained codebase, with two isolated deployments:

| Environment | Audience | Data source | Access |
| --- | --- | --- | --- |
| Public portfolio demo | Recruiters and visitors | Browser-local fictional seed data | Public URL, no account required |
| Private beta | Individually approved testers | `projtrack-portfolio` Supabase (`qdagzcivuddbztsybxfk`) | Invite-only Supabase accounts |

Do not create a permanent copy of the application or maintain unrelated "demo" and "real" branches. They will drift, duplicate fixes, and make security reviews harder. Use short-lived feature branches for development, merge reviewed work into `main`, and select behavior through deployment-specific environment variables.

The current `main` branch is the shared reviewed source for both deployments. The private deployment now exists, but remains closed to external testers until its final owner-only isolation and invitation tests pass.

## Recommended repository and deployment layout

### Public portfolio deployment

- Vercel project: the public `relay-portfolio-demo` deployment.
- Branch: `main`.
- Set `NEXT_PUBLIC_DEMO_MODE=true`.
- Do not expose Supabase, Firebase, or service-role credentials to the browser.
- Keep all visitor changes in IndexedDB/local browser storage and offer **Reset demo**.
- Do not use Supabase for public-demo application data. Move the guarded keepalive to the private-beta deployment before removing the public deployment's Supabase variables.

### Private beta deployment

- Deploy the same reviewed `main` source to a second Vercel project. The initial deployment may use the Vercel CLI; connect Git later only if automatic private deployments are desired.
- Give it the separate URL `relay-private-beta.vercel.app`.
- Set `NEXT_PUBLIC_DEMO_MODE=false` only in that Vercel project.
- Connect it to `projtrack-portfolio` Supabase (`qdagzcivuddbztsybxfk`), which contains the application schema currently configured by this repository. The public demo must stay in browser-local mode and must not use that backend for visitor data.
- Keep all Supabase secret/service keys server-only. The browser receives only the project URL and publishable key; Row Level Security remains the real authorization boundary.
- During implementation, use ordinary short-lived branches such as `feature/private-beta-auth`. Merge only after both demo-mode and live-backend tests pass.

Vercel preview deployments can be protected with Vercel Authentication on the Hobby plan. Treat this as an extra gate, not as database authorization. The application must still enforce invite-only authentication and RLS because links can be forwarded and deployment protection settings can change.

## Selected-user access model

Use invite-only authentication:

1. Disable **Allow new users to sign up** and anonymous sign-ins in Supabase Auth.
2. Invite each approved tester from **Authentication > Users > Add user > Send invitation**.
3. Keep email confirmation enabled and configure only the private beta URL as an allowed redirect.
4. Do not build a public admin invitation endpoint. If one is ever needed, it must be server-only, authenticated as an administrator, rate-limited, and must never return or log a Supabase secret key.
5. Revoke a tester by disabling/deleting their Auth user and removing their workspace membership.

### Data isolation

The preferred model is workspace-based isolation:

- `workspaces`: one private workspace per tester by default.
- `workspace_members`: maps `auth.users.id` to a workspace and role.
- Every project-owned table includes a non-null `workspace_id`.
- Every `SELECT`, `INSERT`, `UPDATE`, and `DELETE` RLS policy verifies membership in that row's workspace.
- New records receive their workspace on the trusted server or through a carefully checked database function; never trust a browser-supplied workspace without RLS verification.
- Authorization roles belong in database membership rows or trusted app metadata, not editable user metadata.

This lets every approved tester exercise projects, tasks, Gantt, calendar, reports, personnel, notifications, and uploads without seeing another tester's content. To demonstrate real collaboration, explicitly place two controlled test accounts in the same workspace. Otherwise, cross-user collaboration is the only capability that remains unobserved.

Do not rely on regularly wiping one shared database. A cleanup schedule limits how long abusive content remains but does not prevent another visitor from seeing it before deletion. Isolation prevents that exposure.

### File security

- Use private Storage buckets.
- Store objects under a workspace/user-scoped path and enforce that scope with `storage.objects` RLS.
- Return short-lived signed URLs only after authorization.
- Enforce small file-size limits and a strict allowlist of MIME types/extensions.
- Generate server-side filenames; never use a user path directly.
- Do not render uploaded HTML/SVG or other active content inline.
- Add per-user storage quotas before enabling uploads for testers.

## Security requirements before private beta launch

- RLS enabled and tested on every exposed table, view, function, and Storage bucket.
- No policy grants broad access to `anon`; live data is available only to `authenticated` users with matching membership.
- Views use `security_invoker = true` where appropriate, or are not exposed.
- Server routes authenticate the user and re-check authorization instead of trusting client-provided IDs.
- All input has length/range validation and database constraints.
- Rate limits cover sign-in attempts and expensive/write-heavy server endpoints.
- Logs, errors, and analytics never include tokens, passwords, private document URLs, or sensitive content.
- Debug/test routes are disabled or inaccessible in production.
- A test account cannot read or mutate a second test account's records, including by guessing IDs.
- Deleting a workspace removes or archives its database rows and private Storage objects.

## Zero-cost and abuse controls

- Keep both Vercel and Supabase on their free plans; do not start a Pro trial, enable paid add-ons, or upgrade the organizations.
- Supabase states that Free Plan usage is not charged; sustained overuse can restrict the service instead. Vercel Hobby similarly pauses/restricts use when included limits are exceeded rather than charging Hobby overages.
- Check the Supabase organization plan and Vercel team plan before every rollout. A future paid upgrade changes the billing risk.
- Retain the once-daily keepalive only for the private Supabase project. It is sufficient for a portfolio-scale project and stays within Vercel Hobby's daily cron restriction.
- The keepalive endpoint must query one tiny row using a server-only publishable key. It must not accept arbitrary table names, SQL, URLs, or request bodies.
- Set database statement timeouts, upload limits, pagination caps, and conservative Realtime subscriptions.
- Monitor Vercel and Supabase usage dashboards and keep account security/MFA enabled.
- Availability on free tiers is best-effort. A keepalive reduces inactivity pauses but cannot guarantee uptime.

## Backup plan for the private Supabase project

Supabase Free projects do not provide downloadable managed backups. Supabase recommends regular logical exports for Free projects.

1. Keep schema changes as reviewed SQL migrations in this repository. This is the recoverable source of truth for structure and policies.
2. Before enabling private beta, create a local logical backup with `supabase db dump` (roles, schema, and data) using the private project's connection string.
3. Repeat the export before migrations and after meaningful tester sessions. For a small beta, a monthly export plus pre-migration exports is adequate.
4. Store backup files outside the Git repository in an encrypted local folder and, if available, a second encrypted location. Never commit connection strings, Auth records, or tester data.
5. Back up Storage objects separately; a database dump contains Storage metadata, not the uploaded files themselves.
6. Test a restore into a disposable local database or unused Supabase project before considering the backup process reliable.
7. Delete obsolete tester data on a documented retention schedule. Backups containing that data must follow the same retention decision.

The repository ignores `/backups/` as an accident-prevention measure, but the preferred backup location is outside the repository entirely.

## Rollout checklist

### Phase 1 - preserve the public demo

- Commit and push the current Demo Mode implementation to `main`.
- Verify the public Vercel project has `NEXT_PUBLIC_DEMO_MODE=true`.
- Record the deployed commit SHA in the release/deployment notes.
- Optionally add a Git tag such as `portfolio-demo-v1` after the commit is verified.

### Phase 2 - build private authorization

- Export the candidate private Supabase project before modifying it.
- Design `workspaces` and `workspace_members` migrations.
- Add `workspace_id` to all tenant-owned records and migrate existing data.
- Replace legacy/broad RLS policies with workspace membership policies.
- Add invite-only login, account lifecycle, private Storage, validation, and rate limits.
- Add automated authorization tests covering two unrelated users and one shared team.

### Phase 3 - deploy privately

- Create the second Vercel project using the same repository.
- Configure only the private project's Supabase values and `NEXT_PUBLIC_DEMO_MODE=false`.
- Enable Vercel Authentication for non-public deployments where available.
- Invite one controlled account, complete a smoke test, then invite selected testers individually.
- Keep the public demo independent and confirm it still makes no live database writes.

## Current Supabase project mapping

The GYG organization currently contains `projtrack-portfolio` (`qdagzcivuddbztsybxfk`) and `GYG_ProjTrack's Project` (`qvoockauodrptvyqqqbe`). Dashboard verification established that the repository currently connects to `qdagzcivuddbztsybxfk`, and the read-only audit found the application's tables, Storage buckets, and two retained owner Auth users there. The corrected mapping is:

- `projtrack-portfolio` (`qdagzcivuddbztsybxfk`): candidate private-beta backend, but only after a backup and complete RLS/security audit.
- `GYG_ProjTrack's Project` (`qvoockauodrptvyqqqbe`): unassigned/legacy project. Leave it untouched and allow it to pause until its contents are separately reviewed.

Do not migrate both projects. The public portfolio deployment remains backend-free for visitor data; only the selected `qdagzcivuddbztsybxfk` backend is prepared for invited testers.

## References

- [Supabase project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)
- [Supabase cost control](https://supabase.com/docs/guides/platform/cost-control)
- [Supabase database backups](https://supabase.com/docs/guides/platform/backups)
- [Supabase Auth configuration](https://supabase.com/docs/guides/auth/general-configuration)
- [Supabase user invitations](https://supabase.com/docs/guides/auth/users)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase private Storage buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- [Vercel Hobby plan](https://vercel.com/docs/plans/hobby)
- [Vercel deployment protection](https://vercel.com/docs/deployment-protection)
- [Vercel environments](https://vercel.com/docs/deployments/environments)
