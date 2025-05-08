import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { SupabaseAdapter } from "@next-auth/supabase-adapter";
// Supabase client for adapter. Ensure this path is correct.
// For adapter, we usually need service_role key, not anon key.
// The supabase client used by the adapter should be configured with the service_role key.
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "admin@example.com",
        },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!credentials?.email || !credentials.password) {
          return null;
        }

        // IMPORTANT: In a real app, use bcrypt or a similar library to hash and compare passwords.
        // Storing plain text passwords or comparing them directly is highly insecure.
        if (
          credentials.email === adminEmail &&
          credentials.password === adminPassword
        ) {
          // For Supabase adapter, it's best to find or create the user in Supabase `users` table.
          // The adapter will then link this user to NextAuth sessions/accounts.
          // Let's try to fetch user from Supabase to ensure it exists for the adapter.
          // This part might need adjustment based on how you manage users in Supabase (e.g., Supabase Auth vs. custom table).
          // Assuming NextAuth adapter manages the users table linked to Supabase Auth.

          // For CredentialsProvider, we typically return a user object.
          // The SupabaseAdapter will use this information.
          // It needs an 'id' that can be used as a foreign key.
          // If your Supabase users are managed by Supabase Auth, their IDs are UUIDs.
          // For this demo, we'll use email as a stand-in ID, but this is NOT ideal for real Supabase Auth.
          // A better approach would be to sign up the admin user via Supabase Auth UI once,
          // then use their actual Supabase user ID here.
          // Or, if not using Supabase Auth for this user, ensure the adapter can create one.

          // Let's simulate finding a user or preparing data for the adapter.
          // The adapter usually expects an `email` to find/create user in `users` table.
          // The `id` should be the Supabase user ID (UUID).
          // Since this is a demo admin, we'll return a structure the adapter can work with.
          // The adapter might create this user in Supabase if it doesn't exist.
          return {
            // id: 'admin-user-id', // This should be a stable ID, ideally a UUID from Supabase.
            // For demo with SupabaseAdapter, often email is enough for it to find/create.
            // The adapter handles the ID generation/linking if the user is new to it.
            email: adminEmail,
            name: "Admin User", // Optional: name
            role: "manager", // Custom property for authorization
          } as any; // Using `any` here because NextAuth User type might not have `role` by default.
        }
        return null;
      },
    }),
  ],
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      // Add role to JWT
      if (user?.role) {
        token.role = user.role;
      }
      // Add user id to JWT
      if (user?.id) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // Add role to session from JWT
      if (token?.role) {
        session.user.role = token.role as string;
      }
      // Add user id to session from JWT
      if (token?.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
    // error: '/auth/error', // Optional custom error page
  },
  // Enable debug messages in development
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
