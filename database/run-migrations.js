/**
 * Run migration SQL files in order against DATABASE_URL (Supabase Postgres).
 * Usage: set DATABASE_URL or SUPABASE_DB_URL, then: node run-migrations.js
 * Example: $env:DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
 */

const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const MIGRATION_ORDER = [
  // Core migrations (in database/migrations/)
  { file: '001_clients_and_org_profile.sql', dir: 'migrations' },
  { file: '001_clients_rls.sql', dir: 'migrations' },
  { file: '002_case_number_sequence.sql', dir: 'migrations' },
  { file: '003_onboarding_inbound_appointments_recordings_invoices.sql', dir: 'migrations' },
  { file: '003_rls.sql', dir: 'migrations' },
  { file: '004_intake_risk_items_valuations_rules_transactions.sql', dir: 'migrations' },
  { file: '004_rls.sql', dir: 'migrations' },
  { file: '005_notifications_calendar_ai_filing.sql', dir: 'migrations' },
  { file: '005_rls.sql', dir: 'migrations' },
  { file: '006_storage_policies.sql', dir: 'migrations' },
  { file: '007_enhanced_invoicing.sql', dir: 'migrations' },
  { file: '008_case_number_rls_and_fk_fixes.sql', dir: 'migrations' },
  // Phase 7: Assessment engine (in database/)
  { file: 'phase7_assessment_schema.sql', dir: '.' },
  { file: 'phase7_rls_policies.sql', dir: '.' },
  // Phase 7B: Report packs (in database/)
  { file: 'phase7b_report_pack_schema.sql', dir: '.' },
  { file: 'phase7b_report_pack_rls.sql', dir: '.' },
  // Phase 15: Stationery & branding (in database/)
  { file: 'phase15_stationery_schema.sql', dir: '.' },
]

const baseDir = __dirname

async function run() {
  const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL
  if (!databaseUrl) {
    console.error('Set DATABASE_URL or SUPABASE_DB_URL (Supabase: Settings → Database → Connection string URI)')
    process.exit(1)
  }

  const client = new Client({ connectionString: databaseUrl })
  try {
    await client.connect()
    console.log('Connected. Running migrations...\n')

    for (const entry of MIGRATION_ORDER) {
      const dir = entry.dir === '.' ? baseDir : path.join(baseDir, entry.dir)
      const filePath = path.join(dir, entry.file)

      if (!fs.existsSync(filePath)) {
        console.warn(`  SKIP (not found): ${entry.file}`)
        continue
      }

      const sql = fs.readFileSync(filePath, 'utf8')
      await client.query(sql)
      console.log(`  OK: ${entry.file}`)
    }

    console.log('\nAll migrations complete.')
  } catch (err) {
    console.error('\nMigration failed:', err.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

run()
