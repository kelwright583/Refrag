/**
 * Run migration SQL files in order against DATABASE_URL (Supabase Postgres).
 * Usage: set DATABASE_URL or SUPABASE_DB_URL, then: node run-migrations.js
 * Example: $env:DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
 */

const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const MIGRATION_ORDER = [
  '001_clients_and_org_profile.sql',
  '001_clients_rls.sql',
  '002_case_number_sequence.sql',
  '003_onboarding_inbound_appointments_recordings_invoices.sql',
  '003_rls.sql',
  '004_intake_risk_items_valuations_rules_transactions.sql',
  '004_rls.sql',
  '005_notifications_calendar_ai_filing.sql',
  '005_rls.sql',
  '006_storage_policies.sql',
]

const migrationsDir = path.join(__dirname, 'migrations')

async function run() {
  const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL
  if (!databaseUrl) {
    console.error('Set DATABASE_URL or SUPABASE_DB_URL (Supabase: Settings → Database → Connection string URI)')
    process.exit(1)
  }

  const client = new Client({ connectionString: databaseUrl })
  try {
    await client.connect()
    console.log('Connected. Running migrations...')
    for (const file of MIGRATION_ORDER) {
      const filePath = path.join(migrationsDir, file)
      if (!fs.existsSync(filePath)) {
        console.warn('Skip (not found):', file)
        continue
      }
      const sql = fs.readFileSync(filePath, 'utf8')
      await client.query(sql)
      console.log('OK:', file)
    }
    console.log('Migrations complete.')
  } catch (err) {
    console.error('Migration failed:', err.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

run()
