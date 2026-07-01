-- Unified search (fase 3): pg_trgm voor partial + fuzzy zoeken.
-- Idempotent: veilig om herhaald te draaien (IF NOT EXISTS overal).
-- De zoek-query draait via $queryRaw met similarity()/ILIKE; deze indexes
-- versnellen ILIKE '%..%' en similarity() op de hot kolommen.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Ticket: subject + IT-snippet velden (serienummer, pc-naam, licentie, taken)
CREATE INDEX IF NOT EXISTS idx_ticket_subject_trgm        ON "Ticket" USING gin (subject gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ticket_tasksperformed_trgm ON "Ticket" USING gin ("tasksPerformed" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ticket_pcname_trgm         ON "Ticket" USING gin ("pcName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ticket_serialnumber_trgm   ON "Ticket" USING gin ("serialNumber" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ticket_officelicense_trgm  ON "Ticket" USING gin ("officeLicense" gin_trgm_ops);

-- Asset: naam + toegewezen persoon (Asset heeft GEEN serienummer; die staat op Ticket)
CREATE INDEX IF NOT EXISTS idx_asset_name_trgm       ON "Asset" USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_asset_assignedto_trgm ON "Asset" USING gin ("assignedTo" gin_trgm_ops);

-- Company (client): naam + korte naam
CREATE INDEX IF NOT EXISTS idx_company_name_trgm      ON "Company" USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_company_shortname_trgm ON "Company" USING gin ("shortName" gin_trgm_ops);

-- KB-artikel: titel + body (content). Klein volume -> trgm volstaat, geen tsvector.
CREATE INDEX IF NOT EXISTS idx_kbarticle_title_trgm   ON "KbArticle" USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_kbarticle_content_trgm ON "KbArticle" USING gin (content gin_trgm_ops);

-- Contact: naam + email
CREATE INDEX IF NOT EXISTS idx_contact_name_trgm  ON "Contact" USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_contact_email_trgm ON "Contact" USING gin (email gin_trgm_ops);
