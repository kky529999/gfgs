import Link from 'next/link';
import { getMonthlyDeliveryTargetsAction } from '@/lib/monthly-policies/actions';
import { getAuthCookie } from '@/lib/auth/cookie';
import { DeliveryTargetListClient } from './_components/DeliveryTargetListClient';

export default async function MonthlyDeliveryTargetsPage() {
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

  const result = await getMonthlyDeliveryTargetsAction();
  const targets = result.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">月度达量配置</h1>
          <p className="text-gray-500 mt-1">管理各品牌每月的送货量目标、底薪和达标奖励</p>
        </div>
        <Link
          href="/monthly-delivery-targets/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          新建配置
        </Link>
      </div>

      {/* Target List */}
      <DeliveryTargetListClient targets={targets} />
    </div>
  );
}
