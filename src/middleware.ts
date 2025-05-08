import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = request.nextUrl;

  const isAuthenticated = !!token;
  const isManager = token?.role === 'manager';

  // Redirect unauthenticated users trying to access protected routes to login
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Protect admin routes: only managers allowed
  if (pathname.startsWith('/admin')) {
    if (!isManager) {
      // If not a manager, redirect to dashboard or an unauthorized page
      const dashboardUrl = new URL('/dashboard', request.url);
      // Optionally, add an error to display on the dashboard or unauthorized page
      // dashboardUrl.searchParams.set('error', 'unauthorized');
      // For now, just redirecting to dashboard. Could be /unauthorized page.
      return NextResponse.redirect(dashboardUrl); 
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',   // Protect all routes under /admin
    '/dashboard/:path*', // Protect all routes under /dashboard
    '/dashboard',      // Protect the main dashboard page
  ],
};
