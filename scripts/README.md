# Scripts

This directory contains operational scripts for the Unify platform.

## `seed-demo.ts`
Optional seed script that populates the database with demo data:
- 2 departments (CS, EE)
- 10 users: 1 admin, 1 expert, 1 head, 3 professors, 5 students
- 4 courses
- 3 course specifications
- 9 final enrollments
- 1 resource file, 1 notice, 1 FAQ, 1 ticket

Run with: `cd apps/api && npx ts-node ../../scripts/../prisma/seed-demo.ts`
Or: `npm run db:seed-demo`

**All demo users have password:** `Demo1234!@`

⚠️ **WARNING:** Never run this in production.

## `backup.sh`
Daily backup of PostgreSQL database + storage directory.
Configurable retention (default 30 days).

Setup daily cron:
```bash
chmod +x scripts/backup.sh
crontab -e
# Add:
0 2 * * * /app/unify/scripts/backup.sh >> /var/log/unify-backup.log 2>&1
```

## `restore.sh`
Restore database and storage from a backup file.
Usage: `./scripts/restore.sh <db-backup.sql.gz> [storage-backup.tar.gz]`

Will prompt for confirmation before overwriting.

## `generate-passwords.ts`
Generate a batch of strong random passwords for manual account setup.
Run with: `npx ts-node scripts/generate-passwords.ts [count]`

## `excel-templates/user-bulk-upload-template.xlsx`
Excel template with the required columns for bulk user upload via the Owner Panel.
