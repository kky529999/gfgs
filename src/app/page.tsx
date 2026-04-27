import { redirect } from 'next/navigation';
import { getAuthCookie } from '@/lib/auth/cookie';

export default async function HomePage() {
  const auth = await getAuthCookie();

  if (auth) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
