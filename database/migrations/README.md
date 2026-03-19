# Database Migrations

Run these **after** the base `schema.sql` and `rls_policies.sql`.

## Full Run Order

### Base schema (run first via Supabase SQL Editor)

1. `schema.sql` — Core tables, enums, indexes, triggers
2. `rls_policies.sql` — Helper functions + RLS for all base tables

### Migrations (run in order)

| # | File | Description |
|---|------|-------------|
| 001 | `001_clients_and_org_profile.sql` | Clients table, org extensions (legal_name, VAT, etc.), case client_id |
| 001 | `001_clients_rls.sql` | RLS for clients and client_rate_structures |
| 002 | `002_case_number_sequence.sql` | case_number_sequences table + get_next_case_number() function |
| 003 | `003_onboarding_inbound_appointments_recordings_invoices.sql` | Onboarding, client_rate_matrices, inbound_emails, appointments, recordings, invoices |
| 003 | `003_rls.sql` | RLS for migration 003 tables |
| 004 | `004_intake_risk_items_valuations_rules_transactions.sql` | intake_documents, extracted_fields, case_risk_items, valuation_snapshots, client_rules, transactions |
| 004 | `004_rls.sql` | RLS for migration 004 tables |
| 005 | `005_notifications_calendar_ai_filing.sql` | notification_rules, calendar_blocks, ai_processing_log, search_vector |
| 005 | `005_rls.sql` | RLS for migration 005 tables (with is_staff() access) |
| 006 | `006_storage_policies.sql` | Evidence storage bucket + RLS for storage.objects |
| 007 | `007_enhanced_invoicing.sql` | Extended invoicing: line items, assessment rates, org/client/invoice columns |
| 008 | `008_case_number_rls_and_fk_fixes.sql` | RLS for case_number_sequences, fix intake_documents FK |

### Phase 7: Assessment Engine (in database/ root)

| # | File | Description |
|---|------|-------------|
| P7a | `phase7_assessment_schema.sql` | 15 assessment tables, 14 enums |
| P7a | `phase7_rls_policies.sql` | Full RLS for all Phase 7 tables |
| P7b | `phase7b_report_pack_schema.sql` | report_packs, report_pack_items |
| P7b | `phase7b_report_pack_rls.sql` | RLS for report pack tables |

### Phase 15: Stationery & Branding (in database/ root)

| # | File | Description |
|---|------|-------------|
| P15 | `phase15_stationery_schema.sql` | Org stationery settings (logo, colours) |

## Automated migration runner

```bash
# Set your Supabase connection string, then:
cd database
node run-migrations.js
```

The runner executes migrations 001–008 and Phase 7/7B/15 in the correct order. Base schema and rls_policies must be applied manually first.

## Notes

- All RLS files use `DROP POLICY IF EXISTS` before `CREATE POLICY` for idempotent re-runs.
- The migration runner skips files that don't exist yet (e.g. phase15 before it's created).
- There is no migration tracking table — scripts are designed to be idempotent via `IF NOT EXISTS` and `DROP POLICY IF EXISTS`.
