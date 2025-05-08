import type { DefaultUser, DefaultSession } from 'next-auth';
import type { JWT as DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id?: string | null;
      role?: string | null;
    } & DefaultSession['user']; // Extends default user properties like name, email, image
  }

  interface User extends DefaultUser {
    role?: string | null;
    // id is already part of DefaultUser
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id?: string | null;
    role?: string | null;
    // DefaultJWT already includes name, email, picture, sub
  }
}
