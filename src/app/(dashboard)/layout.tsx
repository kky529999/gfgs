import { redirect } from 'next/navigation';
import { getAuthCookie } from '@/lib/auth/cookie';
import { refreshSessionAction } from '@/lib/auth/actions';
import Sidebar from '@/components/sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 检查登录状态
  const auth = await getAuthCookie();
  if (!auth) {
    redirect('/login');
  }

  // 刷新 RLS 会话
  await refreshSessionAction();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar
        userRole={auth.role}
        userName={auth.phone}
      />

      {/* Main content */}
      <div className="lg:pl-64">
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
