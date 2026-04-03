import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";

export function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background relative flex flex-row-reverse">
      <Sidebar />
      <div className="flex-grow flex flex-col min-h-screen pr-64">
        <TopNav />
        {/* Main Content Area */}
        <main className="pt-20 px-8 pb-12 w-full max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
