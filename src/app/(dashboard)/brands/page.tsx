import Link from 'next/link';
import { getBrands } from '@/lib/brands/actions';
import { getAuthCookie } from '@/lib/auth/cookie';
import { BrandListClient } from './_components/BrandListClient';

export default async function BrandsPage() {
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

  const { data: brands } = await getBrands({ includeInactive: true });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">品牌管理</h1>
          <p className="text-gray-500 mt-1">共 {brands?.length || 0} 个品牌</p>
        </div>
        <Link
          href="/brands/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          新建品牌
        </Link>
      </div>

      {/* Brand List */}
      <BrandListClient brands={brands || []} />
    </div>
  );
}
