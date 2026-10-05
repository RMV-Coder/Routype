import NextAuth from "next-auth";
import { authOptions } from "./config";

const handler = NextAuth(authOptions);
export default handler;