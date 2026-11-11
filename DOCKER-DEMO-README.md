# Global Opportunities: LOCAL Docker demonstration

This overlay adds deployment files, a Docker-only settings module, and a catalogue transfer command.
The only supplied replacement of an existing file is frontend/next.config.ts; back it up first.
No existing database, .env, requirements.txt, private storage, or bank deployment is copied or reset.
This is NOT a Railway-ready manifest or a production security configuration.
The supplied files have not been built against your complete repository.

## 1. Extract at repository root

Merge backend/ and frontend/ folders; do not replace whole directories.
Add these lines to your existing root .gitignore (do not replace that file):

.env.docker
.env.docker.*
!.env.docker.example

## 2. Export ONLY already reviewed locality reference

Run from the repository root with your existing local database configured:

.\backend\.venv\Scripts\python.exe .\backend\manage.py transfer_demo_localities --export .\backend\demo_reference\reviewed_localities.json

The command exports active, is_verified=True Burundi locality reference only, using commune codes.
It does not export people, bank information, users, passwords, proposals, or credentials.
Only export records you genuinely reviewed. No OCR result is automatically verified.
If zero reviewed rows exist, stop and review/import the catalogue first.
Do not run import_burundi_localities --mark-verified blindly.
The JSON is included in the backend image; review its reference-only content before committing.

## 3. Generate local secrets (PowerShell; run once)

The following command refuses to overwrite an existing .env.docker:

.\backend\.venv\Scripts\python.exe -c "from pathlib import Path; import secrets; p=Path('.env.docker'); f=p.open('x', encoding='utf-8'); f.write('DJANGO_SECRET_KEY='+secrets.token_urlsafe(64)+'\nPOSTGRES_PASSWORD='+secrets.token_urlsafe(32)+'\n'); f.close()"

Never commit .env.docker. Do not change its DB password after initialization unless you also
change the password inside PostgreSQL. Never use docker compose config output as a public report:
it can contain resolved secrets.

## 4. Build and start

Docker Desktop must use Linux containers. Internet access is needed for packages, npm,
fonts referenced by your Next build, and ClamAV signatures.

 docker compose --env-file .env.docker -f compose.demo.yaml up -d --build
 docker compose --env-file .env.docker -f compose.demo.yaml ps -a
 docker compose --env-file .env.docker -f compose.demo.yaml logs --tail=100 release scanner-init backend worker frontend

release and scanner-init exiting with code 0 is SUCCESS; they are one-time initialization jobs.
Worker startup waits for signatures. Do not repeatedly download signatures when ClamAV reports
rate limiting: inspect the message and respect its cooldown. Do not disable scanning.
Allow several GB of free Docker memory for the full local stack; measure actual consumption.
No Railway cost or memory-fit guarantee is made.

Frontend: http://localhost:13000
Admin: http://localhost:18000/admin/
PostgreSQL and Redis have no host port mapping. Published HTTP ports bind to loopback only.
Existing Windows apps on ports 3000/8000/5432/6379 can remain separate.

## 5. Fictitious accounts / reference data

The new DB has no existing users, proposals, uploaded files, or photo uploads.

 docker compose --env-file .env.docker -f compose.demo.yaml exec backend python manage.py createsuperuser

Use the Django admin to create/configure fictitious personal accounts and any Expert approvals
using your application's actual admin fields. An admin superuser is not automatically an eligible
personal applicant. Account eligibility still requires a linked Person, active status, and verified
email timestamp; names/age/gender and other checks still apply. Do not guess a custom user-creation
command or disable permissions. Email uses Django's dummy backend: nothing is delivered and no
verification codes are printed. Registration/email verification is NOT an end-to-end demo feature
yet. Configure a real HTTPS email provider before offering public registration on Railway.
Public uploads/profile photos are not publicly served by this bundle; confidential proposals are
read only through your existing authenticated endpoints.

## 6. Test background preparation

Upload a small proposal using an eligible fictitious account. Do NOT run repair commands.
Watch worker logs. Verify READY + CLEAN, protected page display, editable review and posting.
Then stop/restart the stack and confirm DB and private documents persist.

 docker compose --env-file .env.docker -f compose.demo.yaml logs -f worker beat
 docker stats

Ctrl+C stops log viewing, not containers.

## 7. Rebuild and maintain

After source changes:
 docker compose --env-file .env.docker -f compose.demo.yaml up -d --build

Inspect release logs after every schema update. Existing seed commands use get_or_create and
preserve existing records; they do not silently reconcile changes to catalogue definitions.
Re-exporting reference data requires rebuilding the backend image.

scanner-updater checks for signature updates while running. Signature presence is not a substitute
for monitoring signature age, updater logs, or actual scan success.

Stop without deleting data:
 docker compose --env-file .env.docker -f compose.demo.yaml down

Do NOT add -v unless you intentionally want to DELETE this Docker demo's persistent data.
A volume is not a backup. Do not copy raw live PostgreSQL files as a backup; use pg_dump.

## 8. Before public hosting

This local topology has more services than a constrained Railway trial can necessarily host.
The shared Docker volumes do not translate into cross-service Railway shared volumes.
Resolve object storage vs supervised combined service, resources, domain/HTTPS, secure cookies,
proxy trust, transactional email, reviewed data policy, secrets, backup/restore and release handling.
Review dependencies: requirements.txt contains ranges/unpinned dependencies; package-lock.json
must be reviewed and updated for security. This bundle does not guarantee patched versions.
The frontend Docker build bakes the internal Django rewrite destination into the Next build;
changing a runtime environment variable alone is not sufficient. Railway needs its own routing plan.
