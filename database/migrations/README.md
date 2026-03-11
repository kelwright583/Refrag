# Database Migrations

Run these **after** the base `schema.sql` and `rls_policies.sql`.

## Order

1. `001_clients_and_org_profile.sql` — Clients table, org extensions, case updates
2. `001_clients_rls.sql` — RLS for clients and client_rate_structures

## Applying in Supabase

1. Open Supabase Dashboard → SQL Editor
2. Run `001_clients_and_org_profile.sql`
3. Run `001_clients_rls.sql`

## What’s added

- **clients** — Insurers, fintechs, etc., that assessors work for
- **client_rate_structures** — Per-client billing rates
- **organisations** — New columns: `legal_name`, `registration_number`, `vat_number`, `logo_storage_path`, `banking_details`, `address`, `certification_storage_path`, `signature_storage_path`, `country`
- **cases** — New columns: `client_id`, `insurer_reference`
