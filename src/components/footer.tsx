import Link from 'next/link'
import { Settings } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface mt-auto">
      <div className="max-w-6xl mx-auto px-6 h-12 flex items-center justify-between">
        <p className="text-xs text-text-muted">
          made with ❤️{' '}
          <a
            href="https://watch-ed.vercel.app/milasabd"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:text-accent-hover transition-colors"
          >
            milas
          </a>
        </p>
        <Link
          href="/dashboard/settings"
          className="text-text-muted hover:text-text-primary transition-colors"
        >
          <Settings className="w-4 h-4" />
        </Link>
      </div>
    </footer>
  )
}
