import { PwaInstallPrompt } from '@/components/pwa-install-prompt';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-800 px-4">
      <div className="w-full max-w-md space-y-4">
        {children}
        <PwaInstallPrompt />
      </div>
    </div>
  );
}
