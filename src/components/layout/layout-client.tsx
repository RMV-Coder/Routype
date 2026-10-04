"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AchievementToasts } from "@/components/layout/achievement-toasts";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

const BARE_ROUTES = ["/auth", "/terms-of-service", "/privacy-policy"];

const SECTION_TITLES: Record<string, string> = {
  "": "Echoes",
  "my-journals": "My Journals",
  entries: "Piece",
  typearena: "TypeArena",
  leaderboard: "Leaderboards",
  achievements: "Achievements",
  profile: "Profile",
  messages: "Messages",
  settings: "Settings",
};

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (BARE_ROUTES.some((route) => pathname.startsWith(route))) {
    return <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>;
  }
  const [section = "", sub] = pathname.split("/").filter(Boolean);
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href={section === "entries" ? "/" : `/${section}`} className="hover:text-foreground">{SECTION_TITLES[section] ?? section}</Link>
            {sub && section === "typearena" && <><span>/</span><span className="text-foreground">Race</span></>}
          </nav>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</main>
      </SidebarInset>
      <AchievementToasts />
    </SidebarProvider>
  );
}
