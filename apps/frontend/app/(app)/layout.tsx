import { verifySession } from '@/lib/auth/dal';
import { SidebarFooter } from '@/components/layout/sidebar-footer';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { MobileShell } from '@/components/layout/mobile-shell';
import { BottomNav } from '@/components/layout/bottom-nav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();

  const sidebar = (
    <>
      <SidebarNav />
      <SidebarFooter name={session.name} email={session.email} />
    </>
  );

  const bottomNav = (
    <BottomNav userName={session.name} userEmail={session.email} />
  );

  return (
    <MobileShell sidebar={sidebar} bottomNav={bottomNav}>
      {children}
    </MobileShell>
  );
}
