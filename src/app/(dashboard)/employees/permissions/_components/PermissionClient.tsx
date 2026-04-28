'use client';

import { useState } from 'react';
import { updateEmployeeRoleAction, toggleEmployeeStatusAction } from '@/lib/employees/actions';
import type { Employee, Department } from '@/types';

interface EmployeeWithDepartment extends Omit<Employee, 'department'> {
  department?: Department | null;
}

interface PermissionClientProps {
  employees: EmployeeWithDepartment[];
}

const ROLE_LABELS: Record<string, string> = {
  admin: '综合管理',
  business: '业务部',
  tech: '技术部',
  gm: '总经理',
};

const ROLE_OPTIONS = [
  { value: '', label: '无部门' },
  { value: 'admin', label: '综合管理' },
  { value: 'business', label: '业务部' },
  { value: 'tech', label: '技术部' },
];

export function PermissionClient({ employees }: PermissionClientProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [search, setSearch] = useState('');

  const filteredEmployees = employees.filter((emp) => {
    if (!search) return true;
    return (
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.phone.includes(search)
    );
  });

  const handleRoleChange = async (employeeId: string, departmentId: string) => {
    setLoading(employeeId);
    setMessage(null);

    const result = await updateEmployeeRoleAction(employeeId, departmentId || null);
    if (result.success) {
      setMessage({ type: 'success', text: '权限已更新' });
      setTimeout(() => window.location.reload(), 1000);
    } else {
      setMessage({ type: 'error', text: result.error || '更新失败' });
    }

    setLoading(null);
  };

  const handleToggleStatus = async (employeeId: string, currentStatus: boolean) => {
    setLoading(employeeId);
    setMessage(null);

    const result = await toggleEmployeeStatusAction(employeeId);
    if (result.success) {
      setMessage({
        type: 'success',
        text: currentStatus ? '已禁用该员工' : '已启用该员工',
      });
      setTimeout(() => window.location.reload(), 1000);
    } else {
      setMessage({ type: 'error', text: result.error || '操作失败' });
    }

    setLoading(null);
  };

  const getRoleFromDepartment = (department?: Department | null): string => {
    if (!department) return '未分配';
    return ROLE_LABELS[department.code] || department.name;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">员工权限管理</h2>
          <input
            type="text"
            placeholder="搜索姓名或手机号..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-64"
          />
        </div>
        <p className="text-sm text-gray-500">
          提示：通过修改员工所属部门来调整其系统权限。总经理(GM)权限需单独分配。
        </p>
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
                当前权限
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                所属部门
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状态
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-indigo-600 font-medium">
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
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        employee.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {employee.is_active ? '正常' : '已禁用'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900">
                      {getRoleFromDepartment(employee.department)}
                    </div>
                    {employee.title && (
                      <div className="text-xs text-gray-500">{employee.title}</div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <select
                      value={employee.department_id || ''}
                      onChange={(e) => handleRoleChange(employee.id, e.target.value)}
                      disabled={loading === employee.id}
                      className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      {ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-4 text-center">
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
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
        共 {filteredEmployees.length} 名员工
      </div>
    </div>
  );
}
