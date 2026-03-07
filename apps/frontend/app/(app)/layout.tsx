import { verifySession } from '@/lib/auth/dal';
import { SidebarFooter } from '@/components/layout/sidebar-footer';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/assets', label: 'Assets' },
  { href: '/liabilities', label: 'Liabilities' },
  { href: '/goals', label: 'Goals' },
  { href: '/expenses', label: 'Expenses' },
  { href: '/reports', label: 'Reports' },
  { href: '/documents', label: 'Documents' },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-gray-900 text-white flex-shrink-0 flex flex-col h-screen sticky top-0 relative">
        {/* Logo */}
        <div className="p-4 border-b border-gray-700 flex-shrink-0">
          <span className="text-lg font-bold text-brand-light">Finances</span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="block px-3 py-2 rounded-lg hover:bg-gray-700 text-sm text-gray-300 hover:text-white transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Footer: user info, theme toggle, logout */}
        <SidebarFooter name={session.name} email={session.email} />
      </aside>

      <main className="flex-1 overflow-auto bg-gray-50">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
