'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getEmployeeAction,
  updateEmployeeAction,
  resetEmployeePasswordAction,
  getDepartmentsAction,
} from '@/lib/employees/actions';
import type { Employee, Department } from '@/types';

interface EditEmployeePageProps {
  params: Promise<{ id: string }>;
}

export default function EditEmployeePage({ params }: EditEmployeePageProps) {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    title: '',
    department_id: '',
    is_active: true,
  });

  // Resolve params
  useEffect(() => {
    params.then((p) => setEmployeeId(p.id));
  }, [params]);

  // Fetch employee and departments
  useEffect(() => {
    if (!employeeId) return;

    async function fetchData() {
      if (!employeeId) return;
      setLoading(true);
      const [empResult, deptResult] = await Promise.all([
        getEmployeeAction(employeeId),
        getDepartmentsAction(),
      ]);

      if (empResult.success && empResult.data) {
        setEmployee(empResult.data);
        setFormData({
          name: empResult.data.name,
          phone: empResult.data.phone,
          title: empResult.data.title || '',
          department_id: empResult.data.department_id || '',
          is_active: empResult.data.is_active,
        });
      } else {
        setError(empResult.error || '获取员工信息失败');
      }

      if (deptResult.success && deptResult.data) {
        setDepartments(deptResult.data);
      }

      setLoading(false);
    }

    fetchData();
  }, [employeeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) return;

    setSaving(true);
    setError('');
    setSuccess('');

    // Basic validation
    if (!formData.name.trim()) {
      setError('请输入员工姓名');
      setSaving(false);
      return;
    }
    if (!formData.phone.trim()) {
      setError('请输入手机号');
      setSaving(false);
      return;
    }
    if (!/^1\d{10}$/.test(formData.phone)) {
      setError('请输入有效的手机号（11位数字，以1开头）');
      setSaving(false);
      return;
    }

    const result = await updateEmployeeAction(employeeId, {
      name: formData.name,
      phone: formData.phone,
      title: formData.title,
      department_id: formData.department_id || null,
      is_active: formData.is_active,
    });

    if (result.success) {
      setSuccess('员工信息已更新');
      setEmployee((prev) =>
        prev
          ? {
              ...prev,
              name: formData.name,
              phone: formData.phone,
              title: formData.title,
              department_id: formData.department_id || null,
              is_active: formData.is_active,
            }
          : null
      );
      router.refresh();
    } else {
      setError(result.error || '更新失败');
    }

    setSaving(false);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleResetPassword = async () => {
    if (!employeeId) return;
    if (!confirm('确定要将该员工密码重置为默认密码（123456）吗？')) {
      return;
    }

    setError('');
    setSuccess('');

    const result = await resetEmployeePasswordAction(employeeId);
    if (result.success) {
      setSuccess('密码已重置为 123456');
    } else {
      setError(result.error || '重置密码失败');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">员工不存在</h2>
          <Link href="/employees" className="text-indigo-600 hover:text-indigo-800 mt-4 inline-block">
            返回员工列表
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/employees"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">编辑员工</h1>
          <p className="text-gray-500 mt-1">修改员工信息</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                姓名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="输入员工姓名"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                手机号 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="输入11位手机号"
                maxLength={11}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                部门
              </label>
              <select
                name="department_id"
                value={formData.department_id || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">选择部门</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                职位
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="输入职位（如：经理、专员等）"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              name="is_active"
              id="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">
              启用该账号
            </label>
          </div>

          {/* Status Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">账号状态</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">当前状态：</span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    employee.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {employee.is_active ? '在职' : '已禁用'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">改密状态：</span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    employee.must_change_password
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {employee.must_change_password ? '待改密' : '已修改'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">创建时间：</span>
                <span className="text-gray-900">
                  {new Date(employee.created_at).toLocaleDateString('zh-CN')}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleResetPassword}
              className="px-4 py-2 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors"
            >
              重置密码
            </button>
            <div className="flex gap-4">
              <Link
                href="/employees"
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
