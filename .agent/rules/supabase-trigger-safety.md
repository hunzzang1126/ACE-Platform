# Supabase Auth & Database Trigger Safety Rules

> **Created after incident: "Database error saving new user" (2026-03-20)**
> New user OAuth signup was completely blocked for ~2 weeks because a
> database trigger failed silently, rolling back the entire auth transaction.

---

## ABSOLUTE RULES

### 1. Every `auth.users` Trigger MUST Have EXCEPTION Handler

```sql
-- ★ CORRECT — trigger can never block user creation
CREATE OR REPLACE FUNCTION my_trigger()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO my_table (...) VALUES (...);
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'my_trigger failed: %', SQLERRM;
        RETURN NEW;  -- ← ALWAYS return NEW, never block
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**WHY:** PostgreSQL triggers on `auth.users` run inside the same transaction as user creation.
If ANY trigger fails without EXCEPTION handler, the ENTIRE transaction rolls back —
the user is never created, and Supabase returns a generic "Database error saving new user".

### 2. All Referenced Tables MUST Exist Before Deploying Triggers

Before deploying ANY trigger that references a table:
- Verify the table EXISTS in Supabase Table Editor (not just in migration SQL files)
- Migration SQL files on disk are NOT automatically applied — they must be manually run in SQL Editor
- If a trigger references `subscriptions` but that table was never created → silent failure → blocked signups

### 3. Check ALL Triggers on `auth.users` After Any Schema Change

```sql
-- Run this after ANY auth-related migration
SELECT tgname FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass
AND tgname NOT LIKE 'RI_%';
```

Every trigger in the result must:
- Have EXCEPTION handler (rule 1)
- Reference only tables that exist (rule 2)
- Use `ON CONFLICT DO NOTHING` for idempotent inserts

### 4. Debug Auth Failures with Postgres Logs FIRST

When OAuth signup fails:
1. **FIRST**: Supabase Dashboard → Logs → Postgres → look for red ERROR lines
2. The error message will be the EXACT SQL error (e.g., `relation "X" does not exist`)
3. Do NOT guess at client-side causes (PKCE, cookies, redirects) before checking server logs
4. The callback URL `?error=server_error&error_description=Database+error+saving+new+user` means a SERVER-SIDE database error — always check Postgres logs

### 5. SQL Migration Checklist

Before running any new migration:
- [ ] All referenced tables exist
- [ ] All referenced functions exist (e.g., `handle_updated_at()`)
- [ ] All triggers have EXCEPTION handlers
- [ ] `ON CONFLICT DO NOTHING` for all INSERT triggers (handles re-login gracefully)
- [ ] Test with a fresh user signup after running migration

---

## Incident Timeline (2026-03-20)

| What happened | Root cause |
|---|---|
| New users couldn't sign up via Google OAuth | `auto_create_subscription()` trigger tried to INSERT into non-existent `subscriptions` table |
| Error: "Database error saving new user" | Transaction rolled back, user never created in `auth.users` |
| Existing users unaffected | Their `auth.users` row already existed, trigger only fires on INSERT |

**Misdiagnoses that wasted time:**
1. Assumed cookie/PKCE issue → added `flowType: 'pkce'` (wrong)
2. Assumed client-side redirect issue → rewrote AuthCallback multiple times (wrong)
3. Created `subscriptions` table with wrong schema (wrong PRIMARY KEY)
4. Didn't check Postgres logs until 30+ minutes in (should have been step 1)

**Correct fix:** Create `subscriptions` table with correct schema + add EXCEPTION handlers to ALL `auth.users` triggers.
