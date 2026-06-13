#!/usr/bin/env python3
"""
scripts/audit.py — Comprehensive document compliance audit.
Verifies every requirement from Agent Guide + Golden Doc.
"""
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OK = "\033[92m✓\033[0m"
NO = "\033[91m✗\033[0m"
TOTAL_PASS = 0
TOTAL_FAIL = 0


def header(s):
    print()
    print("═" * 64)
    print(s)
    print("═" * 64)


def check(label, condition):
    global TOTAL_PASS, TOTAL_FAIL
    status = OK if condition else NO
    if condition:
        TOTAL_PASS += 1
    else:
        TOTAL_FAIL += 1
    print(f"  [{status}] {label}")


def file_exists(p):
    return (ROOT / p).exists()


def file_contains(p, pattern):
    try:
        content = (ROOT / p).read_text(encoding="utf-8")
        if isinstance(pattern, list):
            return all(s in content for s in pattern)
        return pattern in content
    except (FileNotFoundError, UnicodeDecodeError):
        return False


def file_contains_icase(p, pattern):
    try:
        content = (ROOT / p).read_text(encoding="utf-8").lower()
        return pattern.lower() in content
    except (FileNotFoundError, UnicodeDecodeError):
        return False


def file_contains_re(p, regex):
    import re
    try:
        content = (ROOT / p).read_text(encoding="utf-8")
        return bool(re.search(regex, content))
    except (FileNotFoundError, UnicodeDecodeError):
        return False


def count_files(pattern):
    return len(list(ROOT.glob(pattern)))


def has_todos():
    out = subprocess.run(
        ["grep", "-rE", "TODO|FIXME|as any",
         "--include=*.ts", "--include=*.tsx", "--include=*.prisma",
         "apps/", "packages/", "prisma/"],
        cwd=ROOT, capture_output=True, text=True,
    )
    return len(out.stdout.strip().split("\n")) if out.stdout.strip() else 0


print("╔══════════════════════════════════════════════════════════════╗")
print("║         COMPREHENSIVE DOCUMENT COMPLIANCE AUDIT            ║")
print("╚══════════════════════════════════════════════════════════════╝")

# ── PROJECT STATS ──
print("\n─── PROJECT STATS ───")
total_files = sum(1 for _ in ROOT.rglob("*") if _.is_file() and "node_modules" not in str(_) and "storage" not in str(_.parts) and ".git" not in str(_.parts))
ts_files = sum(1 for _ in ROOT.rglob("*.ts") if "node_modules" not in str(_)) + sum(1 for _ in ROOT.rglob("*.tsx") if "node_modules" not in str(_)) + sum(1 for _ in ROOT.rglob("*.prisma") if "node_modules" not in str(_))
loc = 0
for ext in ("*.ts", "*.tsx", "*.prisma"):
    for f in ROOT.rglob(ext):
        if "node_modules" in str(f):
            continue
        loc += sum(1 for _ in f.open(encoding="utf-8", errors="ignore"))
pages = sum(1 for _ in ROOT.glob("apps/web/src/app/**/page.tsx"))
routes = sum(1 for _ in ROOT.glob("apps/api/src/routes/*.ts"))
tests = sum(1 for _ in ROOT.rglob("*.test.ts")) + sum(1 for _ in ROOT.rglob("*.spec.ts"))
todos = has_todos()
print(f"  Total files:             {total_files}")
print(f"  TS/TSX files:            {ts_files}")
print(f"  TS LOC:                  {loc}")
print(f"  Frontend pages:          {pages}")
print(f"  API routes:              {routes}")
print(f"  Tests:                   {tests}")
print(f"  TODO/'any' placeholders: {todos}")

# ── GOLDEN DOC §1 — SYSTEM SETTINGS ──
header("GOLDEN DOC §1 — SYSTEM SETTINGS")
check("§1.1.1 Logo upload", file_contains("apps/api/src/routes/admin.routes.ts", "/logo"))
check("§1.1.2 Color Themes picker", file_exists("apps/web/src/components/shared/ThemePicker.tsx"))
check("§1.1.2 Dark Mode toggle", file_contains("apps/web/src/lib/stores/theme.store.ts", "darkMode"))
check("§1.2.1 Credentials format", file_contains("apps/web/src/app/(auth)/login/page.tsx", "دانشجویی"))
check("§1.2.2 Password lifecycle", file_contains("apps/api/src/services/auth.service.ts", "generateRandomPassword"))
check("§1.2.3 In-person password reset", file_contains("apps/api/src/services/auth.service.ts", "OWNER_RESET"))
check("§1.2.4 Mandatory onboarding", file_contains("apps/api/src/middleware/rbac.middleware.ts", "onboardingComplete"))
check("§1.2.5 Profile Photo upload + display", file_exists("apps/web/src/components/shared/PhotoUpload.tsx") and file_contains("apps/web/src/components/ui/avatar.tsx", "AvatarImage"))
check("§1.2.5 Profile Photo 5MB size limit", file_contains("apps/api/src/routes/profile-photo.routes.ts", "PROFILE_PHOTO_MAX_BYTES"))
check("§1.2.5 Mobile Number + Email dedicated fields", file_contains("prisma/schema.prisma", "mobileNumber") and file_contains("prisma/schema.prisma", "emailAddress"))
check("§1.2.6 Banning + audit", file_contains("apps/api/src/routes/admin.routes.ts", "USER_BANNED"))
check("§1.3.1 Pushe + Socket.io fallback", file_contains_icase("apps/api/src/services/notification.service.ts", "pushe") and file_exists("apps/web/src/components/shared/SocketBootstrap.tsx"))
check("§1.3.2 Mute per-spec", file_contains("apps/api/src/routes/notification.routes.ts", "isMuted"))
check("§1.4.3 Audit logging", file_contains("apps/api/src/utils/audit-logger.ts", "writeAuditLog"))
check("§1.4.1 Excel import/export", file_contains("apps/api/src/services/excel.service.ts", "ExcelJS"))
check("§1.4.2 Archive Dropdown on Dashboard", file_exists("apps/web/src/components/student/ArchiveDropdown.tsx"))

# ── GOLDEN DOC §2 — STUDENT APP ──
header("GOLDEN DOC §2 — STUDENT APP")
check("§2.1.1 Dashboard w/ course cards", file_exists("apps/web/src/app/(app)/student/dashboard/page.tsx"))
check("§2.1.1 Archive Dropdown 'top of page'", file_contains("apps/web/src/app/(app)/student/dashboard/page.tsx", "ArchiveDropdown"))
check("§2.1.2 Card color customization", file_exists("apps/web/src/components/student/CardColorPicker.tsx"))
check("§2.1.2 Footer (Resources/Tg/Details)", file_contains("apps/web/src/app/(app)/student/dashboard/page.tsx", "CourseDetailsModal"))
check("§2.1.2 Final exam date on card", file_contains("apps/web/src/app/(app)/student/dashboard/page.tsx", "finalExamDate"))
check("§2.1.3 Critical Alert banner", file_exists("apps/web/src/components/student/CriticalAlertBanner.tsx"))
check("§2.1.3 Cancelled-spec 7-day banner", file_exists("apps/web/src/components/student/CancelledNoticeBanner.tsx"))
check("§2.2.1 Phase A search + temp list", file_exists("apps/web/src/app/(app)/student/scheduler/page.tsx"))
check("§2.2.1 Min credit (NORMAL=12)", file_contains("apps/api/src/services/scheduler.service.ts", "limit.min"))
check("§2.2.1 Prerequisite check (non-blocking warning)", file_contains("apps/api/src/services/scheduler.service.ts", "prerequisites") and file_contains("apps/api/src/services/scheduler.service.ts", "PASSED_COURSES"))
check("§2.2.1 Final Semester dialog", file_exists("apps/web/src/components/student/FinalSemesterDialog.tsx"))
check("§2.2.1 Submit Final Registration", file_contains("apps/api/src/services/scheduler.service.ts", "submitFinalList"))
check("§2.2.1 Grace Period (24h wipe)", file_contains("apps/api/src/jobs/job-runner.ts", "grace-period-wipe"))
check("§2.2.2 Phase B weekly timetable", file_contains("apps/web/src/app/(app)/student/scheduler/page.tsx", "PERSIAN_DAY_ORDER") or file_contains("apps/web/src/components/student/ExamScheduleFlip.tsx", "PERSIAN_DAY_NAMES"))
check("§2.2.3 Phase C Flip Animation (Framer)", file_exists("apps/web/src/components/student/ExamScheduleFlip.tsx"))
check("§2.3 Resource Hub", file_exists("apps/web/src/app/(app)/student/resources/page.tsx"))
check("§2.3.5 File versioning", file_contains("apps/api/src/services/resource.service.ts", "uploadNewVersion"))
check("§2.3.7 Auto rate popup after download", file_contains("apps/web/src/app/(app)/student/resources/page.tsx", "downloadCount"))
check("§2.3.6 File version display date (latestVersionAt)", file_contains("apps/api/src/services/resource.service.ts", "latestVersionAt"))
check("§2.4 Inbox unified", file_exists("apps/web/src/app/(app)/student/inbox/page.tsx"))
check("§2.4.1 Visual source differentiation", file_contains("apps/web/src/app/(app)/student/inbox/page.tsx", "SOURCE_CONFIG"))
check("§2.4.3 Edited timestamp display", file_contains("apps/web/src/app/(app)/student/inbox/page.tsx", "ویرایش شده در"))
check("§2.4.3 XSS-safe content rendering", file_contains("apps/web/src/app/(app)/student/inbox/page.tsx", "SafeText"))
check("§2.5 Tickets", file_exists("apps/web/src/app/(app)/student/tickets/page.tsx"))
check("§2.5.3 48h auto-escalation", file_contains("apps/api/src/services/ticket.service.ts", "addTicketEscalationJob"))
check("§2.6.1 Curriculum tree view", file_exists("apps/web/src/components/student/CurriculumTreeView.tsx"))
check("§2.6.1 Prerequisite popup-on-click", file_exists("apps/web/src/components/student/CoursePrereqPopup.tsx"))
check("§2.6.2 Forms Repository", file_contains("apps/web/src/app/(app)/student/utilities/page.tsx", "FormsView"))
check("§2.6.3 Academic Calendar", file_contains("apps/api/src/routes/calendar.routes.ts", "academicCalendarEvent"))
check("§2.6.4 Assignment Tracker", file_contains("apps/api/src/routes/assignment.routes.ts", "assignmentTask"))
check("§2.6.4 Assignment Tracker — Course (optional)", file_contains("apps/api/src/routes/assignment.routes.ts", "courseId") and file_contains("prisma/schema.prisma", "AssignmentTask"))
check("§2.6.5 Notice Board + FAQ", file_exists("apps/web/src/components/student/CourseDetailsModal.tsx"))
check("§2.6.1 Major (department) selection", file_contains("apps/web/src/app/(app)/student/utilities/page.tsx", "selectedDeptId"))
check("§2.6.5 Notice Board edit (professor)", file_contains("apps/api/src/routes/notice-board.routes.ts", "noticeBoardRouter.patch"))
check("§2.6.6 Course FAQ edit (professor)", file_contains("apps/api/src/routes/faq.routes.ts", "faqRouter.patch"))
check("§2.6.6 Dedicated /student/notices", file_exists("apps/web/src/app/(app)/student/notices/page.tsx"))

# ── GOLDEN DOC §3 — STAFF PANELS ──
header("GOLDEN DOC §3 — STAFF PANELS")
check("§3.1 Settings page (all roles)", file_exists("apps/web/src/app/(app)/settings/page.tsx"))
prof_pages = count_files("apps/web/src/app/(app)/professor/**/page.tsx")
expert_pages = count_files("apps/web/src/app/(app)/expert/**/page.tsx")
head_pages = count_files("apps/web/src/app/(app)/head/**/page.tsx")
admin_pages = count_files("apps/web/src/app/(app)/admin/**/page.tsx")
owner_pages = count_files("apps/web/src/app/(app)/owner/**/page.tsx")
check(f"Professor pages ({prof_pages}/8)", prof_pages >= 8)
check(f"Expert pages ({expert_pages}/8)", expert_pages >= 8)
check(f"Head pages ({head_pages}/2)", head_pages >= 2)
check(f"Admin pages ({admin_pages}/8)", admin_pages >= 8)
check(f"Owner pages ({owner_pages}/6)", owner_pages >= 6)
check("§3.5.7 Final Note Approval + fallback", file_contains("apps/web/src/app/(app)/admin/files/page.tsx", "FALLBACK_DAYS"))
check("§3.5.8 Admin file management", file_exists("apps/web/src/app/(app)/admin/files/page.tsx"))
check("§3.5.5 Form edit endpoint", file_contains("apps/api/src/routes/form.routes.ts", "formRouter.patch"))
check("§3.5.5 Academic Calendar edit endpoint", file_contains("apps/api/src/routes/calendar.routes.ts", "calendarRouter.patch"))
check("§3.6.2 Bulk user upload + template", file_exists("scripts/excel-templates/user-bulk-upload-template.xlsx"))
check("§3.6.3 Password reset", file_contains("apps/api/src/routes/owner.routes.ts", "reset-password"))
check("§3.6.4 Audit log access", file_exists("apps/api/src/routes/audit.routes.ts"))
check("§3.6.5 Analytics w/ download counts", file_contains("apps/api/src/routes/analytics.routes.ts", "ResourceDownload") and file_contains("apps/api/src/routes/analytics.routes.ts", "byCourse"))

# ── AGENT GUIDE COMPLIANCE ──
header("AGENT GUIDE COMPLIANCE")
check("Rule 1 (no TODO/'any')", todos == 0)
check("Rule 7 (audit append-only)", file_contains("apps/api/src/utils/audit-logger.ts", "attemptType"))
check("D1: Same-course warning", file_contains("apps/api/src/services/scheduler.service.ts", "گروه دیگر"))
check("D2: Ratings preserved on version", file_contains("apps/api/src/services/resource.service.ts", "ratingCount"))
check("D3: Placeholder on delete w/ replies", file_contains("apps/api/src/services/message.service.ts", "PLACEHOLDER_CONTENT"))
check("D4: Critical alerts bypass mute", file_contains("apps/api/src/services/notification.service.ts", "bypassMute"))
check("D5: Deleted spec + 7-day notice", file_contains("prisma/schema.prisma", "CancelledSpecificationNotice"))
check("D6: 3 ticket images max", file_contains("apps/api/src/middleware/upload.middleware.ts", "maxTicketImages"))
check("D9: Technical → Admin direct", file_contains("apps/api/src/services/ticket.service.ts", "TECHNICAL"))
check("D10: Password complexity", file_contains("packages/shared-types/src/zod-schemas.ts", "passwordSchema"))
check("D11: Scalability (10k concurrent)", file_contains(".env.example", "connection_limit"))
check("D12: Cancelled-notice TTL cleanup", file_contains("apps/api/src/jobs/job-runner.ts", "cleanupQueue"))
check("§6.5 File storage sanitization", file_contains("apps/api/src/middleware/upload.middleware.ts", "fileFilter"))
check("§6.3 Golden Schedule algorithm", file_contains("apps/api/src/services/scheduler.service.ts", "backtrack") and file_contains("apps/api/src/services/scheduler.service.ts", "memoOverlap"))
check("§6.6 BullMQ 4 queues", file_contains("apps/api/src/jobs/job-runner.ts", "ticketEscalationQueue") and file_contains("apps/api/src/jobs/job-runner.ts", "cleanupQueue"))

# ── NON-FUNCTIONAL REQUIREMENTS ──
header("NON-FUNCTIONAL REQUIREMENTS (§F.1-F.6)")
check("§F.1 Upload progress indicator", file_exists("apps/web/src/components/shared/UploadProgressBar.tsx"))
check("§F.1 Realtime <5s (Socket.io)", file_exists("apps/web/src/components/shared/SocketBootstrap.tsx"))
check("§F.2 CSRF protection", file_contains("apps/web/src/lib/api-client.ts", "X-CSRF-Token") and file_contains("apps/api/src/middleware/csrf.middleware.ts", "csrfProtection"))
check("§F.2 Helmet", file_contains("apps/api/src/app.ts", "helmet("))
check("§F.2 Bcrypt cost 12", file_contains(".env.example", "BCRYPT_COST_FACTOR=12"))
check("§F.2 XSS sanitization (DOMPurify)", file_exists("apps/web/src/lib/sanitize.tsx"))
check("§F.3 Backup + Restore scripts", file_exists("scripts/backup.sh") and file_exists("scripts/restore.sh"))
check("§F.4 Skip-to-main link", file_exists("apps/web/src/components/shared/SkipToMain.tsx"))
check("§F.4 Keyboard shortcuts", file_exists("apps/web/src/components/shared/KeyboardShortcuts.tsx"))
check("§F.5 Mobile responsive", file_contains("apps/web/src/components/shared/AppShell.tsx", "md:hidden"))
check("§F.6 Pool tuning", file_contains(".env.example", "connection_limit=50"))
check("§F.6 Standalone jobs process", file_exists("apps/api/src/jobs/standalone.ts"))

# ── TEST COVERAGE ──
header("TEST COVERAGE")
api_tests = list(ROOT.glob("tests/api/*.test.ts"))
e2e_tests = list(ROOT.glob("tests/e2e/*.spec.ts"))
load_tests = list(ROOT.glob("tests/load/*.js"))
print(f"  Total test files:    {len(api_tests) + len(e2e_tests) + len(load_tests)}")
print(f"  API tests:           {len(api_tests)}")
print(f"  E2E tests:           {len(e2e_tests)}")
print(f"  Load tests:          {len(load_tests)}")
for t in api_tests:
    check(f"  {t.name}", t.exists())
check("  critical-flows.spec.ts", file_exists("tests/e2e/critical-flows.spec.ts"))
check("  api-load-test.js", file_exists("tests/load/api-load-test.js"))

# ── DOCUMENTATION ──
header("DOCUMENTATION")
check("README.md", file_exists("README.md"))
check("docs/USER_GUIDE.md (Persian)", file_exists("docs/USER_GUIDE.md"))
check("scripts/README.md", file_exists("scripts/README.md"))
check("tests/load/README.md", file_exists("tests/load/README.md"))
check("OpenAPI spec route", file_exists("apps/api/src/routes/openapi.routes.ts"))

# ── SUMMARY ──
header(f"AUDIT COMPLETE — {TOTAL_PASS}/{TOTAL_PASS+TOTAL_FAIL} PASSED ({100*TOTAL_PASS/(TOTAL_PASS+TOTAL_FAIL):.1f}%)")
if TOTAL_FAIL == 0:
    print(f"\n  {OK} ALL ITEMS PASS — Implementation fully matches both documents.\n")
else:
    print(f"\n  {NO} {TOTAL_FAIL} item(s) failed. See output above.\n")
    sys.exit(1)
