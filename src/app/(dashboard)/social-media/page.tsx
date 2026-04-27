import { getAuthCookie } from '@/lib/auth/cookie';
import Link from 'next/link';
import { SocialMediaClient } from './_components/SocialMediaClient';

export default async function SocialMediaPage() {
  const auth = await getAuthCookie();
  if (!auth) {
    return <div>未登录</div>;
  }

  // Only admin and gm can access
  if (auth.role !== 'admin' && auth.role !== 'gm') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">无权访问</h2>
          <p className="text-gray-500 mt-2">您没有权限访问此页面</p>
          <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-800 mt-4 inline-block">
            返回工作台
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">自媒体宣传</h1>
          <p className="text-gray-500 mt-1">管理员工视频发布记录及奖励</p>
        </div>
      </div>

      {/* Content */}
      <SocialMediaClient />
    </div>
  );
}
