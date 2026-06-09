import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { API_BASE_URL } from "@/lib/api";

const providers = [
  CredentialsProvider({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    authorize: async (credentials) => {
      if (!credentials?.email || !credentials?.password) {
        return null;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
          }),
        });

        if (!response.ok) {
          return null;
        }

        const data = await response.json();
        const { id, name, email, role } = data.user;
        return { id: String(id), name, email, role };
      } catch {
        return null;
      }
    },
  }),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user?.role) {
        token.role = user.role;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (token.role) {
        session.user.role = token.role as string;
      }
      return session;
    },
    authorized({ auth: session, request: { nextUrl } }) {
      const isLoggedIn = !!session?.user;
      const isAuthPage = nextUrl.pathname.startsWith("/auth");
      if (isAuthPage) {
        return isLoggedIn ? Response.redirect(new URL("/", nextUrl)) : true;
      }
      return isLoggedIn;
    },
  },
});
