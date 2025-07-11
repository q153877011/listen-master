import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  providers: [
    Resend({
      from: process.env.AUTH_EMAIL_FROM as string,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
                  const user = await prisma.user.findUnique({
          where: {
            email: credentials.email as string,
          },
        });

          if (!user || !user.password) {
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            String(credentials.password),
            String(user.password)
          );

          if (!isPasswordValid) {
            return null;
          }

          if (!user.emailVerified) {
            throw new Error("EmailNotVerified");
          }

                  return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        } as any;
        } catch (error) {
          if (error instanceof Error && error.message === "EmailNotVerified") {
            throw error;
          }
          console.error("Credentials auth error:", error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.role = token.role as string | null | undefined;
        session.user.id = token.id as string;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
    verifyRequest: "/verify-email",
  },
});