'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FolderOpen, Calculator, Upload, Plus } from 'lucide-react'

const navLinks = [
  { href: '/dashboard', label: 'Dashboard',     Icon: LayoutDashboard },
  { href: '/projects',  label: 'Projects',      Icon: FolderOpen      },
  { href: '/budgets',   label: 'Budgets',       Icon: Calculator      },
  { href: '/import',    label: 'Import/Export', Icon: Upload          },
]

export default function Navbar() {
  const pathname = usePathname()
  return (
    <header className="bg-slate-900 border-b border-slate-700 sticky top-0 z-50 shadow-lg">
      <div className="flex items-center h-16 px-6">

        {/* Logo + Company Name */}
        <Link href="/dashboard" className="flex items-center gap-3 mr-10 flex-shrink-0">
          <div className="w-10 h-10 rounded overflow-hidden flex items-center justify-center bg-white/5">
            <Image
              src="/gellenbeck-logo.png"
              alt="Gellenbeck Construction"
              width={40}
              height={40}
              className="object-contain w-10 h-10"
              priority
            />
          </div>
          <div className="leading-tight">
            <span className="block text-white text-sm font-black tracking-wide uppercase">
              Gellenbeck
            </span>
            <span className="block text-amber-500 text-[10px] font-semibold tracking-widest uppercase">
              Construction, Inc.
            </span>
          </div>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {navLinks.map(({ href, label, Icon }) => {
            const active = href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(href)
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-all ${
                  active
                    ? 'bg-amber-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
                }`}>
                <Icon className="w-4 h-4" />{label}
              </Link>
            )
          })}
        </nav>

        <div className="flex-1" />

        {/* New Project button */}
        <Link href="/projects/new"
          className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded transition-colors">
          <Plus className="w-3.5 h-3.5" /> New Project
        </Link>

      </div>
    </header>
  )
}
