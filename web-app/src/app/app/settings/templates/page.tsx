/**
 * Communications templates settings page
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  useCommsTemplates,
  useCreateCommsTemplate,
  useUpdateCommsTemplate,
  useDeleteCommsTemplate,
} from '@/hooks/use-comms'
import { CommsTemplate } from '@/lib/types/comms'
import { ArrowLeft, Plus, Edit2, Trash2, Save, X, ChevronDown, ChevronUp } from 'lucide-react'

export default function TemplatesSettingsPage() {
  const router = useRouter()
  const { data: templates, isLoading } = useCommsTemplates()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-copper"></div>
          <p className="text-slate mt-4">Loading templates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/app/settings')}
          className="flex items-center gap-2 text-slate hover:text-charcoal mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Settings
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold text-charcoal">
              Communication Templates
            </h1>
            <p className="text-slate mt-1">Manage email and note templates</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-copper text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus className="w-5 h-5" />
            New Template
          </button>
        </div>
      </div>

      {/* Templates List */}
      {templates && templates.length > 0 ? (
        <div className="space-y-4">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              isEditing={editingId === template.id}
              onEdit={() => setEditingId(template.id)}
              onCancel={() => setEditingId(null)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-slate mb-6">No templates yet. Create your first template.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-copper text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            Create Template
          </button>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateTemplateModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
          }}
        />
      )}
    </div>
  )
}

/**
 * Template Card Component
 */
function TemplateCard({
  template,
  isEditing,
  onEdit,
  onCancel,
}: {
  template: CommsTemplate
  isEditing: boolean
  onEdit: () => void
  onCancel: () => void
}) {
  const [name, setName] = useState(template.name)
  const [subjectTemplate, setSubjectTemplate] = useState(template.subject_template)
  const [bodyTemplate, setBodyTemplate] = useState(template.body_template_md)
  const updateTemplate = useUpdateCommsTemplate()
  const deleteTemplate = useDeleteCommsTemplate()

  const handleSave = async () => {
    try {
      await updateTemplate.mutateAsync({
        templateId: template.id,
        updates: {
          name: name !== template.name ? name : undefined,
          subject_template:
            subjectTemplate !== template.subject_template ? subjectTemplate : undefined,
          body_template_md: bodyTemplate !== template.body_template_md ? bodyTemplate : undefined,
        },
      })
      onCancel()
    } catch (error: any) {
      alert(error.message || 'Failed to update template')
    }
  }

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this template?')) {
      try {
        await deleteTemplate.mutateAsync(template.id)
      } catch (error: any) {
        alert(error.message || 'Failed to delete template')
      }
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      {isEditing ? (
        <div className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper text-lg font-heading font-bold"
            placeholder="Template name"
          />
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              Subject Template
            </label>
            <input
              type="text"
              value={subjectTemplate}
              onChange={(e) => setSubjectTemplate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper"
              placeholder="e.g., Case {{CaseNumber}} - {{ClientName}}"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              Body Template (Markdown)
            </label>
            <textarea
              value={bodyTemplate}
              onChange={(e) => setBodyTemplate(e.target.value)}
              rows={10}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper font-mono text-sm"
              placeholder="Write your template in Markdown. Use {{CaseNumber}}, {{ClientName}}, etc. for placeholders."
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={updateTemplate.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-copper text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-heading font-bold text-charcoal">{template.name}</h3>
              <p className="text-sm text-slate mt-1">Subject: {template.subject_template}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onEdit}
                className="p-2 text-slate hover:text-charcoal transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleDelete}
                className="p-2 text-red-600 hover:text-red-800 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <pre className="whitespace-pre-wrap text-sm text-charcoal font-mono">
              {template.body_template_md}
            </pre>
          </div>
          <PlaceholderReference />
        </div>
      )}
    </div>
  )
}

/**
 * Create Template Modal
 */
function CreateTemplateModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [name, setName] = useState('')
  const [subjectTemplate, setSubjectTemplate] = useState('')
  const [bodyTemplate, setBodyTemplate] = useState('')
  const createTemplate = useCreateCommsTemplate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createTemplate.mutateAsync({
        name: name.trim(),
        subject_template: subjectTemplate.trim(),
        body_template_md: bodyTemplate.trim(),
      })
      setName('')
      setSubjectTemplate('')
      setBodyTemplate('')
      onSuccess()
    } catch (error: any) {
      alert(error.message || 'Failed to create template')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-heading font-bold text-charcoal">Create Template</h2>
          <button
            onClick={onClose}
            className="text-slate hover:text-charcoal transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              Template Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper"
              placeholder="e.g., Initial Contact Email"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              Subject Template *
            </label>
            <input
              type="text"
              value={subjectTemplate}
              onChange={(e) => setSubjectTemplate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper"
              placeholder="e.g., Case {{CaseNumber}} - {{ClientName}}"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              Body Template (Markdown) *
            </label>
            <textarea
              value={bodyTemplate}
              onChange={(e) => setBodyTemplate(e.target.value)}
              rows={12}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper font-mono text-sm"
              placeholder="Write your template in Markdown. Use {{CaseNumber}}, {{ClientName}}, etc. for placeholders."
              required
            />
          </div>

          <PlaceholderReference />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-charcoal hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createTemplate.isPending || !name.trim() || !subjectTemplate.trim() || !bodyTemplate.trim()}
              className="px-4 py-2 bg-copper text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {createTemplate.isPending ? 'Creating...' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const PLACEHOLDER_GROUPS = [
  {
    label: 'Case',
    tokens: [
      { token: '{{CaseNumber}}', desc: 'Case reference number' },
      { token: '{{ClientName}}', desc: 'Client / insured name' },
      { token: '{{ClaimReference}}', desc: 'Claim reference from insurer' },
      { token: '{{LossDate}}', desc: 'Date of loss' },
      { token: '{{Location}}', desc: 'Loss location' },
      { token: '{{BrokerName}}', desc: 'Broker name' },
    ],
  },
  {
    label: 'Assessment',
    tokens: [
      { token: '{{Outcome}}', desc: 'Assessment outcome (Repairable, Write-off, etc.)' },
      { token: '{{ClaimNumber}}', desc: 'Claim number from assessment' },
      { token: '{{InsurerName}}', desc: 'Insurer name' },
      { token: '{{DateAssessed}}', desc: 'Date of assessment' },
      { token: '{{AssessorName}}', desc: 'Assessor name' },
      { token: '{{VehicleDetails}}', desc: 'Vehicle make / model / year / reg' },
      { token: '{{RepairTotal}}', desc: 'Total repair cost (excl. VAT)' },
      { token: '{{GrandTotal}}', desc: 'Grand total (incl. VAT)' },
    ],
  },
]

function PlaceholderReference() {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs font-medium text-slate hover:text-charcoal transition-colors"
      >
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        Available Placeholders
      </button>
      {expanded && (
        <div className="mt-3 space-y-3">
          {PLACEHOLDER_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-semibold text-charcoal uppercase tracking-wide mb-1.5">{group.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {group.tokens.map(({ token, desc }) => (
                  <span
                    key={token}
                    title={desc}
                    className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-mono cursor-default"
                  >
                    {token}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
