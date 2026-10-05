"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { BookOpen, Keyboard, MessageSquare, Settings, SquareUser, Trophy, Medal, Waves } from "lucide-react"
import { NavMain } from "@/components/layout/nav-main"
import { NavSecondary } from "@/components/layout/nav-secondary"
import { NavUser } from "@/components/layout/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const write = [
  { title: "Echoes", url: "/", icon: Waves },
  { title: "My Journals", url: "/my-journals", icon: BookOpen },
]
const play = [
  { title: "TypeArena", url: "/typearena", icon: Keyboard },
  { title: "Leaderboards", url: "/leaderboard", icon: Medal },
  { title: "Achievements", url: "/achievements", icon: Trophy },
]
const social = [
  { title: "Profile", url: "/profile", icon: SquareUser },
  { title: "Messages", url: "/messages", icon: MessageSquare },
]
const secondary = [
  { title: "Settings", url: "/settings", icon: Settings },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession()
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <Image src="/logo_routype.svg" alt="Routype" width={218} height={66} className="rounded-md object-cover py-3" priority />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain label="Write" items={write} />
        <NavMain label="Play" items={play} />
        <NavMain label="Social" items={social} />
        <NavSecondary items={secondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        {session && <NavUser user={session.user} />}
      </SidebarFooter>
    </Sidebar>
  )
}
