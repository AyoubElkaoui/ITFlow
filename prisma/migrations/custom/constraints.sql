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

-- Dagafsluiting: netto-uren in kwartierstappen, binnen 0..24.
-- DO-block zodat herhaald uitvoeren niet faalt op reeds bestaande constraints.
DO $$ BEGIN
  ALTER TABLE "WorkDay"
    ADD CONSTRAINT "WorkDay_netHours_range"
    CHECK ("netHours" >= 0 AND "netHours" <= 24 AND ("netHours" * 4) = floor("netHours" * 4));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "WorkDayAllocation"
    ADD CONSTRAINT "WorkDayAllocation_hours_range"
    CHECK ("hours" >= 0 AND "hours" <= 24 AND ("hours" * 4) = floor("hours" * 4));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
