'use client';
import { AppSidebar } from "@/components/custom/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { usePathname } from "next/navigation";
import React from 'react';

export default function LayoutClient({children,}:{children:React.ReactNode;}){
    const pathname = usePathname();
    const showLayout = pathname !== '/auth/signin' && pathname !== '/auth/error';
    if(!showLayout){
        return (
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                {children}
            </div>
        );
    }
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2">
                <div className="flex items-center gap-2 px-4">
                    <SidebarTrigger className="-ml-1" />
                    <Separator
                    orientation="vertical"
                    className="mr-2 data-[orientation=vertical]:h-4"
                    />
                    {pathname.includes('/my-journal') && <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem className="hidden md:block">
                            <BreadcrumbLink href="/my-journal">
                                My Journals
                            </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="hidden md:block" />
                            <BreadcrumbItem>
                            {pathname.includes('/my-journal/') &&<BreadcrumbPage>{pathname.split('/').pop()?.replace(/-/g, ' ').replace(/\s+/g, ' ').replace(/^\w|\s\w/g, (m) => m.toUpperCase())}</BreadcrumbPage>}
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>}
                </div>
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}