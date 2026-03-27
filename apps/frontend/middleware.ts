import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/auth/session';

const protectedRoutes = [
  '/dashboard',
  '/assets',
  '/goals',
  '/expenses',
  '/reports',
  '/documents',
  '/account',
];
const publicRoutes = ['/login', '/register', '/'];

export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some((r) => path.startsWith(r));
  const isPublicRoute = publicRoutes.includes(path);

  const token = req.cookies.get('session')?.value;
  const session = await decrypt(token);

  if (isProtectedRoute && !session?.userId) {
    return NextResponse.redirect(new URL('/login', req.nextUrl));
  }

  if (isPublicRoute && session?.userId && path !== '/') {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)'],
};
