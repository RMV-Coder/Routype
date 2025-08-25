"use client"

import * as React from "react"
import { useSession } from "next-auth/react";
import {
  BookOpen,
  Bot,
  Command,
  Frame,
  Keyboard,
  LifeBuoy,
  Map,
  MessageSquare,
  PieChart,
  Send,
  Settings2,
  SquareTerminal,
  Settings,
  SquarePlus,
  SquareUser,
  Trophy,
  Zap 
} from "lucide-react"
import Image from "next/image";
import { NavMain } from "@/components/custom/nav-main";
import { NavProjects } from "@/components/custom/nav-projects";
import { NavSecondary } from "@/components/custom/nav-secondary";
import { NavUser } from "@/components/custom/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Profile",
      url: "/profile",
      icon: SquareUser ,
      // isActive: true,
      // items: [
      //   {
      //     title: "Profile",
      //     url: "#",
      //   },
      //   {
      //     title: "Starred",
      //     url: "#",
      //   },
      //   {
      //     title: "Settings",
      //     url: "#",
      //   },
      // ],
    },
    {
      title: "Messages",
      url: "/messages",
      icon: MessageSquare ,
    },
    // {
    //   title: "Add Entry",
    //   url: "#",
    //   icon: SquarePlus,
    //   items: [
    //     {
    //       title: "Introduction",
    //       url: "#",
    //     },
    //     {
    //       title: "Get Started",
    //       url: "#",
    //     },
    //     {
    //       title: "Tutorials",
    //       url: "#",
    //     },
    //     {
    //       title: "Changelog",
    //       url: "#",
    //     },
    //   ],
    // },
    {
      title: "My Journal",
      url: "/my-journal",
      icon: BookOpen,
      isActive: true,
      items: [
        {
          title: "Add Entry",
          url: "#",
          // icon: SquarePlus,
        },
        // {
        //   title: "Team",
        //   url: "#",
        // },
        // {
        //   title: "Billing",
        //   url: "#",
        // },
        // {
        //   title: "Limits",
        //   url: "#",
        // },
      ],
    },
    {
      title: "Streaks",
      url: "/streaks",
      icon: Zap,
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Team",
          url: "#",
        },
        {
          title: "Billing",
          url: "#",
        },
        {
          title: "Limits",
          url: "#",
        },
      ],
    },
    {
      title: "TypeArena",
      url: "/typearena",
      icon: Keyboard,
      items: [
        {
          title: "Sprint",
          url: "#",
        },
        {
          title: "Challenger",
          url: "#",
        },
        {
          title: "Zen",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
    },
    {
      title: "Support",
      url: "/support",
      icon: LifeBuoy,
    },
    {
      title: "Feedback",
      url: "/feedback",
      icon: Send,
    },
  ],
  community: [
    {
      name: "Echoes",
      url: "/echoes",
      icon: Frame,
    },
    {
      name: "Friends",
      url: "/friends",
      icon: PieChart,
    },
    {
      name: "My Communities",
      url: "/my-communities",
      icon: Map,
    },
    {
      name: "Achievements",
      url: "/achievements",
      icon: Trophy,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession();
    React.useEffect(()=>{
      if(session){
        console.log(session);
      }
    },[session]);
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                {/* <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Acme Inc</span>
                  <span className="truncate text-xs">Enterprise</span>
                </div> */}
                <Image src="/logo_routype.svg" alt="Image" width={218} height={66} className="rounded-md object-cover py-3" priority />
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.community} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        {session&&<NavUser user={session.user} />}
      </SidebarFooter>
    </Sidebar>
  )
}
