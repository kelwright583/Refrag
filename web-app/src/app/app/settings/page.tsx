/**
 * Settings page - white, minimal, brand icons
 */

'use client'

import Link from 'next/link'
import { Palette } from 'lucide-react'

function ProfileIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#30313A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function SpecialisationIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#30313A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
    </svg>
  )
}

function NotificationIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C72A00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function RatesIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#30313A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1v22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

function TemplateIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C72A00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
      <path d="M10 9H8" />
    </svg>
  )
}

export default function SettingsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-heading font-bold text-charcoal">Settings</h1>
        <p className="text-slate mt-1">Manage your organisation</p>
      </div>

      <div className="space-y-4">
        <Link
          href="/app/settings/profile"
          className="flex items-center gap-4 p-5 bg-white border border-[#D4CFC7] rounded-lg hover:border-[#C9C4BC] transition-colors"
        >
          <span className="p-2 rounded-lg bg-slate/10 shrink-0">
            <ProfileIcon />
          </span>
          <div>
            <h2 className="font-medium text-slate">Company Profile</h2>
            <p className="text-sm text-muted mt-0.5">
              Legal name, address, registration for reports and invoicing
            </p>
          </div>
        </Link>
        <Link
          href="/app/settings/specialisation"
          className="flex items-center gap-4 p-5 bg-white border border-[#D4CFC7] rounded-lg hover:border-[#C9C4BC] transition-colors"
        >
          <span className="p-2 rounded-lg bg-slate/10 shrink-0">
            <SpecialisationIcon />
          </span>
          <div>
            <h2 className="font-medium text-slate">Specialisations</h2>
            <p className="text-sm text-muted mt-0.5">
              Configure what your firm specialises in (motor, property, loss adjusting, investigation)
            </p>
          </div>
        </Link>
        <Link
          href="/app/settings/rates"
          className="flex items-center gap-4 p-5 bg-white border border-[#D4CFC7] rounded-lg hover:border-[#C9C4BC] transition-colors"
        >
          <span className="p-2 rounded-lg bg-slate/10 shrink-0">
            <RatesIcon />
          </span>
          <div>
            <h2 className="font-medium text-slate">Assessment Rates</h2>
            <p className="text-sm text-muted mt-0.5">
              Set your rates for desktop, digital, and site-visit assessments (inclusive or exclusive of VAT)
            </p>
          </div>
        </Link>
        <Link
          href="/app/settings/notifications"
          className="flex items-center gap-4 p-5 bg-white border border-[#D4CFC7] rounded-lg hover:border-[#C9C4BC] transition-colors"
        >
          <span className="p-2 rounded-lg bg-accent/10 shrink-0">
            <NotificationIcon />
          </span>
          <div>
            <h2 className="font-medium text-slate">Notification Rules</h2>
            <p className="text-sm text-muted mt-0.5">
              Configure which status changes trigger email notifications and who receives them
            </p>
          </div>
        </Link>
        <Link
          href="/app/settings/templates"
          className="flex items-center gap-4 p-5 bg-white border border-[#D4CFC7] rounded-lg hover:border-[#C9C4BC] transition-colors"
        >
          <span className="p-2 rounded-lg bg-accent/10 shrink-0">
            <TemplateIcon />
          </span>
          <div>
            <h2 className="font-medium text-slate">Communication Templates</h2>
            <p className="text-sm text-muted mt-0.5">
              Email and note templates for case communications
            </p>
          </div>
        </Link>
        <Link
          href="/app/settings/assessment"
          className="flex items-center gap-4 p-5 bg-white border border-[#D4CFC7] rounded-lg hover:border-[#C9C4BC] transition-colors"
        >
          <span className="p-2 rounded-lg bg-copper/10 shrink-0">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A0522D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </span>
          <div>
            <h2 className="font-medium text-slate">Assessment Settings</h2>
            <p className="text-sm text-muted mt-0.5">
              Labour rates, VAT, write-off thresholds, approved repairers &amp; parts suppliers
            </p>
          </div>
        </Link>
        <Link
          href="/app/settings/stationery"
          className="flex items-center gap-4 p-5 bg-white border border-[#D4CFC7] rounded-lg hover:border-[#C9C4BC] transition-colors"
        >
          <span className="p-2 rounded-lg bg-copper/10 shrink-0">
            <Palette className="w-6 h-6 text-[#A0522D]" />
          </span>
          <div>
            <h2 className="font-medium text-slate">Stationery &amp; Branding</h2>
            <p className="text-sm text-muted mt-0.5">
              Logo, brand colours, and footer disclaimer for reports and invoices
            </p>
          </div>
        </Link>
        <Link
          href="/app/settings/billing"
          className="flex items-center gap-4 p-5 bg-white border border-[#D4CFC7] rounded-lg hover:border-[#C9C4BC] transition-colors"
        >
          <span className="p-2 rounded-lg bg-copper/10 shrink-0">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A0522D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
          </span>
          <div>
            <h2 className="font-medium text-slate">Billing &amp; Credits</h2>
            <p className="text-sm text-muted mt-0.5">
              Manage credits, subscriptions, and payment methods
            </p>
          </div>
        </Link>
      </div>
    </div>
  )
}
