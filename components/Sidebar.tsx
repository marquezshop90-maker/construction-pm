'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FolderKanban, PlusCircle, HardHat } from 'lucide-react'

const nav = [
  { href: '/dashboard', label: 'Dashboard',  Icon: LayoutDashboard },
  { href: '/projects',  label: 'Proyectos',  Icon: FolderKanban },
  { href: '/projects/new', label: 'Nuevo Proyecto', Icon: PlusCircle },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 flex-shrink-0 bg-sidebar flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <HardHat className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight">Construction</p>
          <p className="text-indigo-400 text-xs">Project Manager</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label, Icon }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href) && href !== '/projects/new')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-gray-500 text-xs">© 2025 Construction PM</p>
      </div>
    </aside>
  )
}
