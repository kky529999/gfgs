import Link from 'next/link';
import { getEmployeesAction, getDepartmentsAction, getDefaultPassword } from '@/lib/employees/actions';
import { getAuthCookie } from '@/lib/auth/cookie';
import { EmployeeListClient } from './_components/EmployeeListClient';

export default async function EmployeesPage() {
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
          <Link href="/dashboard" className="text-primary hover:text-primary-hover mt-4 inline-block">
            返回工作台
          </Link>
        </div>
      </div>
    );
  }

  const [employeesResult, departmentsResult] = await Promise.all([
    getEmployeesAction(),
    getDepartmentsAction(),
  ]);

  const employees = employeesResult.data || [];
  const departments = departmentsResult.data || [];
  const defaultPassword = getDefaultPassword();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">员工管理</h1>
          <p className="text-gray-500 mt-1">共 {employees.length} 名员工</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/employees/permissions"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            权限管理
          </Link>
          <Link
            href="/employees/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium active:scale-[0.98]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            新建员工
          </Link>
        </div>
      </div>

      {/* Employee List */}
      <EmployeeListClient
        employees={employees}
        departments={departments}
        defaultPassword={defaultPassword}
      />
    </div>
  );
}
