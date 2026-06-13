import Link from 'next/link'
import { Film } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-bg">
      <div className="text-center">
        <Film className="w-10 h-10 text-text-muted mx-auto mb-4" />
        <h1 className="heading-xl mb-2">Not found</h1>
        <p className="text-text-secondary mb-6">
          This page doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="px-6 py-2.5 bg-accent text-white rounded-sm hover:bg-accent-hover transition-colors text-sm font-medium"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
