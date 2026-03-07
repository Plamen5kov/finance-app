import { verifySession } from '@/lib/auth/dal';
import { SidebarFooter } from '@/components/layout/sidebar-footer';
import { MobileShell } from '@/components/layout/mobile-shell';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/assets', label: 'Assets' },
  { href: '/liabilities', label: 'Liabilities' },
  { href: '/goals', label: 'Goals' },
  { href: '/expenses', label: 'Expenses' },
  { href: '/income', label: 'Income' },
  { href: '/reports', label: 'Reports' },
  { href: '/import', label: 'Import' },
  { href: '/documents', label: 'Documents' },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();

  const sidebar = (
    <>
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
            className="block px-3 py-2.5 rounded-lg hover:bg-gray-700 text-sm text-gray-300 hover:text-white transition-colors active:bg-gray-600"
          >
            {link.label}
          </a>
        ))}
      </nav>

      {/* Footer: user info, theme toggle, logout */}
      <SidebarFooter name={session.name} email={session.email} />
    </>
  );

  return (
    <MobileShell sidebar={sidebar}>
      {children}
    </MobileShell>
  );
}
