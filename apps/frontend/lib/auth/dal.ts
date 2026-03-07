import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decrypt } from './session';

export const verifySession = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  const session = await decrypt(token);

  if (!session?.userId) {
    redirect('/login');
  }

  return { isAuth: true, userId: session.userId, email: session.email, name: session.name };
});
