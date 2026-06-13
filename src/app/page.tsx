import Link from 'next/link'
import { Film } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-bg">
      <div className="text-center max-w-md">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Film className="w-8 h-8 text-accent" />
          <h1 className="heading text-4xl tracking-tight">watch.ed</h1>
        </div>
        <p className="text-lg text-text-secondary mb-2">
          Personal film &amp; TV tracking
        </p>
        <p className="text-sm text-text-muted mb-10">
          Logging what I watch, when I watch it.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link
            href="/login"
            className="px-6 py-2.5 bg-accent text-white rounded-sm hover:bg-accent-hover transition-colors text-sm font-medium"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
