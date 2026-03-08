import { verifySession } from '@/lib/auth/dal';
import { SidebarFooter } from '@/components/layout/sidebar-footer';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { MobileShell } from '@/components/layout/mobile-shell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();

  const sidebar = (
    <>
      <SidebarNav />
      <SidebarFooter name={session.name} email={session.email} />
    </>
  );

  return (
    <MobileShell sidebar={sidebar}>
      {children}
    </MobileShell>
  );
}
