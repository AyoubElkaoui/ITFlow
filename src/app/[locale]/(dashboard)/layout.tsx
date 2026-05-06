import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { PwaInstallPrompt } from "@/components/layout/pwa-install-prompt";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-2 md:block">
          <div className="p-2 md:hidden">
            <MobileSidebar />
          </div>
          <div className="flex-1">
            <Header />
          </div>
        </div>
        {/* Extra bottom padding on mobile for the nav bar */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <MobileNav />

      {/* PWA install prompt */}
      <PwaInstallPrompt />
    </div>
  );
}
