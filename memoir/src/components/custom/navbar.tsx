'use client'

import Link from 'next/link'
import { Button } from "@/components/ui/button";
import { AspectRatio } from '../ui/aspect-ratio';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"

export default function Navbar() {
  return (
    <div className="bg-slate-200 border-b border-slate-300 text-slate-900 sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between">
        {/* Logo */}
        {/* <Link href="/" className="text-xl font-semibold hover:text-slate-300 transition"> */}
          {/* Routype */}
          {/* <AspectRatio ratio={10 / 3} style={{alignSelf:'center', paddingBottom:0}}> */}
            <Image src="/logo_routype.svg" alt="Image" width={109} height={33} className="rounded-md object-cover py-3" />
            {/* </AspectRatio> */}
        {/* </Link> */}
        

        {/* Nav Links */}
        <nav className="hidden md:flex space-x-6">
          <Link href="/journal" className="hover:text-slate-700 transition">Journal</Link>
          <Link href="/game" className="hover:text-slate-700 transition">Typing Game</Link>
          <Link href="/explore" className="hover:text-slate-700 transition">Explore</Link>
        </nav>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="cursor-pointer">
              <AvatarImage src="/avatar.png" alt="User" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-slate-800 text-slate-100 border-slate-700">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
