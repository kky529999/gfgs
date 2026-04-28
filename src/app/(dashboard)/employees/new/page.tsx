'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  createEmployeeAction,
  getDepartmentsAction,
  type CreateEmployeeInput,
} from '@/lib/employees/actions';
import { DEFAULT_PASSWORD } from '@/lib/constants';
import type { Department } from '@/types';

export default function NewEmployeePage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<CreateEmployeeInput>({
    name: '',
    phone: '',
    title: '',
    department_id: '',
    is_active: true,
  });

  // Fetch departments on mount
  useEffect(() => {
    async function fetchDepartments() {
      const result = await getDepartmentsAction();
      if (result.success && result.data) {
        setDepartments(result.data);
      }
    }
    fetchDepartments();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Basic validation
    if (!formData.name.trim()) {
      setError('请输入员工姓名');
      setLoading(false);
      return;
    }
    if (!formData.phone.trim()) {
      setError('请输入手机号');
      setLoading(false);
      return;
    }
    if (!/^1\d{10}$/.test(formData.phone)) {
      setError('请输入有效的手机号（11位数字，以1开头）');
      setLoading(false);
      return;
    }

    const result = await createEmployeeAction(formData);

    if (result.success) {
      router.push('/employees');
      router.refresh();
    } else {
      setError(result.error || '创建失败');
    }

    setLoading(false);
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
          <h1 className="text-2xl font-bold text-gray-900">新建员工</h1>
          <p className="text-gray-500 mt-1">添加新的员工账号</p>
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
              立即启用该账号
            </label>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-800 mb-2">创建说明</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>新员工默认密码为 <span className="font-mono bg-blue-100 px-1 rounded">{DEFAULT_PASSWORD}</span></li>
              <li>员工首次登录时需要修改密码</li>
              <li>手机号将作为登录账号使用</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4">
            <Link
              href="/employees"
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {loading ? '创建中...' : '创建员工'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
