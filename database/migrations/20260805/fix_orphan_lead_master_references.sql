-- ============================================================================
-- 20260805  Repair orphaned master references on `lead`
-- ============================================================================
-- PROBLEM
-- Some leads carry company_id / city_id / state_id values whose master row no
-- longer exists. They are leftovers from earlier masters that were replaced —
-- the geo masters were re-imported (city now holds ~148k rows with new ids) and
-- the company master was reduced to the two Angler BU companies, while the old
-- per-client company ids stayed on the leads.
--
-- SYMPTOM
-- Saving any affected lead fails. The update connects the relation by id, the
-- row is not there, and the whole update is rejected (Prisma P2025) — the user
-- saw only "An internal server error occurred while updating the lead."
--
-- The application no longer 500s on this: it now answers with
--   "The selected City no longer exists. Please choose it again and save."
-- so the records are editable again by re-picking the value. This script is the
-- optional bulk alternative to re-picking each one by hand.
--
-- SAFETY
-- Only rows whose reference is provably dangling are touched, and only the
-- dangling column is cleared — no lead is deleted and no valid value changes.
-- The cleared ids are not recoverable from the app afterwards, so run the audit
-- block first and keep its output (or a backup) if the old ids matter.
--
-- RUN ORDER: audit (read-only) -> backup -> repair.
-- ============================================================================

-- ── 1. AUDIT (read-only) — how many, and which ────────────────────────────────
SELECT 'company_id' AS column_name, COUNT(*) AS orphan_rows
FROM lead l LEFT JOIN company t ON t.id = l.company_id
WHERE l.company_id IS NOT NULL AND t.id IS NULL
UNION ALL
SELECT 'city_id', COUNT(*)
FROM lead l LEFT JOIN city t ON t.id = l.city_id
WHERE l.city_id IS NOT NULL AND t.id IS NULL
UNION ALL
SELECT 'state_id', COUNT(*)
FROM lead l LEFT JOIN state t ON t.id = l.state_id
WHERE l.state_id IS NOT NULL AND t.id IS NULL;

-- The affected leads, so the old values can be recorded before they are cleared.
SELECT l.id, l.company_name, l.company_id, l.city_id, l.state_id
FROM lead l
LEFT JOIN company c ON c.id = l.company_id
LEFT JOIN city    ci ON ci.id = l.city_id
LEFT JOIN state   st ON st.id = l.state_id
WHERE (l.company_id IS NOT NULL AND c.id  IS NULL)
   OR (l.city_id    IS NOT NULL AND ci.id IS NULL)
   OR (l.state_id   IS NOT NULL AND st.id IS NULL)
ORDER BY l.id;

-- ── 2. BACKUP — keep the old values before clearing them ─────────────────────
CREATE TABLE IF NOT EXISTS lead_orphan_reference_backup (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    lead_id     INT          NOT NULL,
    company_id  INT          NULL,
    city_id     INT          NULL,
    state_id    INT          NULL,
    backed_up_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_lead_orphan_backup_lead (lead_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO lead_orphan_reference_backup (lead_id, company_id, city_id, state_id)
SELECT l.id,
       CASE WHEN c.id  IS NULL THEN l.company_id ELSE NULL END,
       CASE WHEN ci.id IS NULL THEN l.city_id    ELSE NULL END,
       CASE WHEN st.id IS NULL THEN l.state_id   ELSE NULL END
FROM lead l
LEFT JOIN company c ON c.id = l.company_id
LEFT JOIN city    ci ON ci.id = l.city_id
LEFT JOIN state   st ON st.id = l.state_id
WHERE (l.company_id IS NOT NULL AND c.id  IS NULL)
   OR (l.city_id    IS NOT NULL AND ci.id IS NULL)
   OR (l.state_id   IS NOT NULL AND st.id IS NULL);

-- ── 3. REPAIR — clear only the dangling references ───────────────────────────
UPDATE lead l
LEFT JOIN company t ON t.id = l.company_id
SET l.company_id = NULL
WHERE l.company_id IS NOT NULL AND t.id IS NULL;

UPDATE lead l
LEFT JOIN city t ON t.id = l.city_id
SET l.city_id = NULL
WHERE l.city_id IS NOT NULL AND t.id IS NULL;

UPDATE lead l
LEFT JOIN state t ON t.id = l.state_id
SET l.state_id = NULL
WHERE l.state_id IS NOT NULL AND t.id IS NULL;

-- ── 4. VERIFY — all three counts must come back 0 ────────────────────────────
SELECT 'company_id' AS column_name, COUNT(*) AS orphan_rows
FROM lead l LEFT JOIN company t ON t.id = l.company_id
WHERE l.company_id IS NOT NULL AND t.id IS NULL
UNION ALL
SELECT 'city_id', COUNT(*)
FROM lead l LEFT JOIN city t ON t.id = l.city_id
WHERE l.city_id IS NOT NULL AND t.id IS NULL
UNION ALL
SELECT 'state_id', COUNT(*)
FROM lead l LEFT JOIN state t ON t.id = l.state_id
WHERE l.state_id IS NOT NULL AND t.id IS NULL;
