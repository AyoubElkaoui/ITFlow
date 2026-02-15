-- Partial unique index: only one primary contact per company
-- Multiple contacts with isPrimary=false are allowed
CREATE UNIQUE INDEX IF NOT EXISTS "Contact_companyId_isPrimary_unique"
  ON "Contact" ("companyId")
  WHERE "isPrimary" = true;

-- Check constraint: time entry hours must be between 0.01 and 24
ALTER TABLE "TimeEntry"
  ADD CONSTRAINT "TimeEntry_hours_range"
  CHECK ("hours" >= 0.01 AND "hours" <= 24);

-- Check constraint: SLA response/resolve time must be positive
ALTER TABLE "SlaPolicy"
  ADD CONSTRAINT "SlaPolicy_responseTime_positive"
  CHECK ("responseTimeHours" > 0);

ALTER TABLE "SlaPolicy"
  ADD CONSTRAINT "SlaPolicy_resolveTime_positive"
  CHECK ("resolveTimeHours" > 0);

-- Check constraint: recurring ticket dayOfWeek between 0-6
ALTER TABLE "RecurringTicket"
  ADD CONSTRAINT "RecurringTicket_dayOfWeek_range"
  CHECK ("dayOfWeek" IS NULL OR ("dayOfWeek" >= 0 AND "dayOfWeek" <= 6));

-- Check constraint: recurring ticket dayOfMonth between 1-31
ALTER TABLE "RecurringTicket"
  ADD CONSTRAINT "RecurringTicket_dayOfMonth_range"
  CHECK ("dayOfMonth" IS NULL OR ("dayOfMonth" >= 1 AND "dayOfMonth" <= 31));
