/**
 * Access denied page
 */

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="text-center">
        <h1 className="text-2xl font-heading font-bold text-charcoal mb-4">Access Denied</h1>
        <p className="text-slate mb-8">You do not have permission to access the admin panel.</p>
        <a href="/admin/login" className="text-copper hover:opacity-80">
          Return to Login
        </a>
      </div>
    </div>
  )
}
