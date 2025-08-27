// import { auth } from "next-auth"
"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { ProfileCard } from "@/components/custom/profile-card";
import { PeopleYouMayKnow } from "@/components/custom/people-you-may-know";

export default function Home() {
  const { data: session } = useSession();
  useEffect(()=>{
    if(session){
      console.log(session);
    }
  },[session]);
  return (
      <>
      <ProfileCard name={session?.user.name as string} image={session?.user.image as string}/>
      <PeopleYouMayKnow />
      </>
  )
}
