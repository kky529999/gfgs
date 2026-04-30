'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toggleEmployeeStatusAction, resetEmployeePasswordAction, setEmployeePasswordAction } from '@/lib/employees/actions';
import type { Employee, Department } from '@/types';

interface EmployeeWithDepartment extends Omit<Employee, 'department'> {
  department?: Department | null;
}

interface EmployeeListClientProps {
  employees: EmployeeWithDepartment[];
  departments: Department[];
  defaultPassword: string;
}

export function EmployeeListClient({ employees, departments, defaultPassword }: EmployeeListClientProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password change modal state
  const [passwordModal, setPasswordModal] = useState<{ open: boolean; employeeId: string; employeeName: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Filter employees
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.phone.includes(search);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && emp.is_active) ||
      (statusFilter === 'inactive' && !emp.is_active);
    const matchesDept = deptFilter === 'all' || emp.department_id === deptFilter;
    return matchesSearch && matchesStatus && matchesDept;
  });

  const handleToggleStatus = async (employeeId: string, currentStatus: boolean) => {
    setLoading(employeeId);
    setMessage(null);

    const result = await toggleEmployeeStatusAction(employeeId);
    if (result.success) {
      setMessage({
        type: 'success',
        text: currentStatus ? '已禁用该员工' : '已启用该员工',
      });
      // Refresh the page to show updated data
      window.location.reload();
    } else {
      setMessage({ type: 'error', text: result.error || '操作失败' });
    }

    setLoading(null);
  };

  const handleResetPassword = async (employeeId: string) => {
    if (!confirm(`确定要将该员工密码重置为默认密码（${defaultPassword}）吗？`)) {
      return;
    }

    setLoading(employeeId);
    setMessage(null);

    const result = await resetEmployeePasswordAction(employeeId);
    if (result.success) {
      setMessage({ type: 'success', text: `密码已重置为 ${defaultPassword}` });
    } else {
      setMessage({ type: 'error', text: result.error || '操作失败' });
    }

    setLoading(null);
  };

  const handleOpenPasswordModal = (employeeId: string, employeeName: string) => {
    setPasswordModal({ open: true, employeeId, employeeName });
    setNewPassword('');
  };

  const handleClosePasswordModal = () => {
    setPasswordModal(null);
    setNewPassword('');
  };

  const handleSetPassword = async () => {
    if (!passwordModal || !newPassword) return;

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: '密码长度不能少于6位' });
      return;
    }

    setLoading(passwordModal.employeeId);
    setMessage(null);

    const result = await setEmployeePasswordAction(passwordModal.employeeId, newPassword);
    if (result.success) {
      setMessage({ type: 'success', text: `已修改 ${passwordModal.employeeName} 的密码` });
      handleClosePasswordModal();
    } else {
      setMessage({ type: 'error', text: result.error || '操作失败' });
    }

    setLoading(null);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-all duration-200 hover:shadow-subtle">
      {/* Filters */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="搜索姓名或手机号..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-150"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-150"
          >
            <option value="all">全部状态</option>
            <option value="active">在职</option>
            <option value="inactive">已禁用</option>
          </select>

          {/* Department Filter */}
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-150"
          >
            <option value="all">全部部门</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mx-4 mt-4 p-3 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                员工信息
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                部门/职位
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状态
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                创建时间
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  暂无员工数据
                </td>
              </tr>
            ) : (
              filteredEmployees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center">
                        <span className="text-primary font-medium">
                          {employee.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{employee.name}</div>
                        <div className="text-sm text-gray-500">{employee.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm">
                      <div className="text-gray-900">
                        {employee.department?.name || '未分配'}
                      </div>
                      {employee.title && (
                        <div className="text-gray-500">{employee.title}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        employee.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {employee.is_active ? '在职' : '已禁用'}
                    </span>
                    {employee.must_change_password && employee.is_active && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-800">
                        待改密
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {new Date(employee.created_at).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/employees/${employee.id}`}
                        className="inline-flex items-center px-3 py-1.5 text-sm text-primary hover:text-primary-hover hover:bg-gray-100 rounded-md transition-colors duration-150"
                      >
                        编辑
                      </Link>
                      <button
                        onClick={() => handleOpenPasswordModal(employee.id, employee.name)}
                        disabled={loading === employee.id}
                        className="inline-flex items-center px-3 py-1.5 text-sm text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-md transition-colors disabled:opacity-50"
                      >
                        {loading === employee.id ? '处理中...' : '修改密码'}
                      </button>
                      <button
                        onClick={() => handleResetPassword(employee.id)}
                        disabled={loading === employee.id}
                        className="inline-flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
                      >
                        {loading === employee.id ? '重置中...' : '重置密码'}
                      </button>
                      <button
                        onClick={() => handleToggleStatus(employee.id, employee.is_active)}
                        disabled={loading === employee.id}
                        className={`inline-flex items-center px-3 py-1.5 text-sm rounded-md transition-colors disabled:opacity-50 ${
                          employee.is_active
                            ? 'text-red-600 hover:text-red-800 hover:bg-red-50'
                            : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                        }`}
                      >
                        {loading === employee.id
                          ? '处理中...'
                          : employee.is_active
                          ? '禁用'
                          : '启用'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
        显示 {filteredEmployees.length} / {employees.length} 名员工
      </div>

      {/* Password Change Modal */}
      {passwordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">修改密码</h3>
              <p className="text-sm text-gray-500 mt-1">为 {passwordModal.employeeName} 设置新密码</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  新密码
                </label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="输入新密码（至少6位）"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-150"
                  autoFocus
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-xl">
              <button
                onClick={handleClosePasswordModal}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSetPassword}
                disabled={loading === passwordModal.employeeId || !newPassword}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {loading === passwordModal.employeeId ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
