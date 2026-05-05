import Link from 'next/link';
import { getCustomersAction } from '@/lib/customers/actions';
import { getAuthCookie } from '@/lib/auth/cookie';
import CustomerTable from '@/components/customers/CustomerTable';

export default async function CustomersPage() {
  const auth = await getAuthCookie();
  if (!auth) {
    return <div>未登录</div>;
  }

  const result = await getCustomersAction();
  const customers = result.data || [];

  const canManage = auth.role === 'admin' || auth.role === 'gm';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">客户列表</h1>
          <p className="text-gray-500 mt-1">共 {customers.length} 位客户</p>
        </div>
        <div className="flex items-center gap-3">
          {canManage ? (
            <Link
              href="/customers/import"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              导入
            </Link>
          ) : null}
          <Link
            href="/customers/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium active:scale-[0.98]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            新建客户
          </Link>
        </div>
      </div>

      {/* Customer Table with Sorting */}
      <CustomerTable customers={customers} canManage={canManage} />
    </div>
  );
}
