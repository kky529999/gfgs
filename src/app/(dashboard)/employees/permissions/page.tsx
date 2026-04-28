import Link from 'next/link';
import { getEmployeesAction } from '@/lib/employees/actions';
import { getAuthCookie } from '@/lib/auth/cookie';
import { PermissionClient } from './_components/PermissionClient';

export default async function PermissionsPage() {
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

  const employeesResult = await getEmployeesAction();
  const employees = employeesResult.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">权限管理</h1>
          <p className="text-gray-500 mt-1">管理系统员工的部门和权限</p>
        </div>
        <Link
          href="/employees"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          返回员工列表
        </Link>
      </div>

      {/* Permission Table */}
      <PermissionClient employees={employees} />

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">权限说明</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>综合管理</strong>：可访问全部模块（建档、备案、发票、薪资等）</li>
          <li>• <strong>业务部</strong>：可管理自己负责的客户，查看公共客户</li>
          <li>• <strong>技术部</strong>：可管理分配给的项目（现勘、设计、发货、并网）</li>
          <li>• <strong>总经理</strong>：拥有最高权限，可访问所有数据和功能</li>
        </ul>
      </div>
    </div>
  );
}