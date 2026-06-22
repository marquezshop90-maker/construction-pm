'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HardHat, LayoutDashboard, FolderOpen, Plus } from 'lucide-react'

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/projects',  label: 'Projects',  Icon: FolderOpen },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <header className="bg-slate-900 border-b border-slate-700 sticky top-0 z-50 shadow-lg">
      <div className="flex items-center h-14 px-6">
        {/* Brand */}
        <Link href="/dashboard" className="flex items-center gap-3 mr-10 flex-shrink-0">
          <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center">
            <HardHat className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <span className="block text-white text-xs font-black tracking-widest uppercase">
              Construction
            </span>
            <span className="block text-orange-400 text-[10px] font-semibold tracking-wider uppercase">
              Project Manager
            </span>
          </div>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {navLinks.map(({ href, label, Icon }) => {
            const active =
              href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(href) && pathname !== '/projects/new'
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-all ${
                  active
                    ? 'bg-orange-500 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="flex-1" />

        <Link href="/projects/new" className="btn-primary text-xs px-3 py-1.5">
          <Plus className="w-3.5 h-3.5" />
          New Project
        </Link>
      </div>
    </header>
  )
}
