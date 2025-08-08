// import { auth } from "next-auth"
"use client";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/ui/navbar";
export default function Home() {
  const { data: session } = useSession();
  return (
      <>
      <Navbar/>
      Signed in as {session?.user?.email} <br/>
      <Button onClick={()=>{signOut()}}>Sign out</Button>
      </>
  )
}
