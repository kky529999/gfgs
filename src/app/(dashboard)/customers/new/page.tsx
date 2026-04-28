'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  createCustomerAction,
  getEmployeesAction,
  getDealersAction,
} from '@/lib/customers/actions';
import { getAuthInfoAction } from '@/lib/auth/actions';
import type { CustomerType } from '@/types/customer';

interface Employee {
  id: string;
  name: string;
  phone: string;
  role: string;
}

interface Dealer {
  id: string;
  name: string;
}

interface FormData {
  name: string;
  phone: string;
  area: string;
  township: string;
  address: string;
  capacity: string;
  brand: string;
  panel_count: string;
  house_type: string;
  customer_type: CustomerType;
  dealer_id: string;
  salesperson_id: string;
  tech_assigned_id: string;
  survey_date: string;
}

export default function NewCustomerPage() {
  const router = useRouter();
  const [auth, setAuth] = useState<{ user_id: string; role: string } | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    area: '',
    township: '',
    address: '',
    capacity: '',
    brand: '',
    panel_count: '',
    house_type: '',
    customer_type: 'direct',
    dealer_id: '',
    salesperson_id: '',
    tech_assigned_id: '',
    survey_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    // Get current user info
    getAuthInfoAction().then((result) => {
      if (result.success && result.data) {
        setAuth(result.data);
        // Pre-select current user as salesperson for business role
        if (result.data.role === 'business') {
          setFormData((prev) => ({ ...prev, salesperson_id: result.data!.user_id }));
        }
      }
    });

    // Load employees for assignment (admin/gm only)
    getEmployeesAction().then((result) => {
      if (result.success && result.data) {
        setEmployees(result.data);
      }
    });

    // Load dealers for assignment
    getDealersAction().then((result) => {
      if (result.success && result.data) {
        setDealers(result.data);
      }
    });
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const result = await createCustomerAction({
        name: formData.name,
        phone: formData.phone || undefined,
        area: formData.area || undefined,
        township: formData.township || undefined,
        address: formData.address || undefined,
        capacity: formData.capacity || undefined,
        brand: formData.brand || undefined,
        panel_count: formData.panel_count ? parseInt(formData.panel_count) : undefined,
        house_type: formData.house_type || undefined,
        customer_type: formData.customer_type,
        dealer_id: formData.dealer_id || undefined,
        salesperson_id: formData.salesperson_id || undefined,
        tech_assigned_id: formData.tech_assigned_id || undefined,
        survey_date: formData.survey_date,
      });

      if (result.success && result.redirectTo) {
        router.push(result.redirectTo);
      } else {
        setError(result.error || '创建失败');
      }
    } catch {
      setError('系统错误');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/customers"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">新建客户</h1>
          <p className="text-gray-500 mt-1">录入新客户信息</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Basic Info Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">基本信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  客户姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="请输入客户姓名"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  联系电话
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="请输入联系电话"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  地区
                </label>
                <input
                  type="text"
                  name="area"
                  value={formData.area}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="如：西安市雁塔区"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  乡镇/街道
                </label>
                <input
                  type="text"
                  name="township"
                  value={formData.township}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="如：曲江街道"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  详细地址
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="请输入详细地址"
                />
              </div>
            </div>
          </div>

          {/* Product Info Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">项目信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  装机容量
                </label>
                <input
                  type="text"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="如：10kW"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  品牌
                </label>
                <input
                  type="text"
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="如：天合"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  组件数量
                </label>
                <input
                  type="number"
                  name="panel_count"
                  value={formData.panel_count}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="如：28"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  房屋类型
                </label>
                <input
                  type="text"
                  name="house_type"
                  value={formData.house_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="如：平房/楼房/别墅"
                />
              </div>
            </div>
          </div>

          {/* Assignment Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">归属分配</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  客户类型
                </label>
                <select
                  name="customer_type"
                  value={formData.customer_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="direct">直客</option>
                  <option value="dealer">二级商客户</option>
                </select>
              </div>

              {formData.customer_type === 'dealer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    二级商
                  </label>
                  <select
                    name="dealer_id"
                    value={formData.dealer_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">请选择二级商</option>
                    {dealers.map((dealer) => (
                      <option key={dealer.id} value={dealer.id}>
                        {dealer.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(auth?.role === 'admin' || auth?.role === 'gm') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      业务员
                    </label>
                    <select
                      name="salesperson_id"
                      value={formData.salesperson_id}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">请选择业务员</option>
                      {employees
                        .filter((e) => e.role === 'business')
                        .map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.name} ({employee.phone})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      技术员
                    </label>
                    <select
                      name="tech_assigned_id"
                      value={formData.tech_assigned_id}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">请选择技术员</option>
                      {employees
                        .filter((e) => e.role === 'tech')
                        .map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.name} ({employee.phone})
                          </option>
                        ))}
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Date Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">时间信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  现勘日期
                </label>
                <input
                  type="date"
                  name="survey_date"
                  value={formData.survey_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-8 flex justify-end gap-4">
          <Link
            href="/customers"
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? '创建中...' : '创建客户'}
          </button>
        </div>
      </form>
    </div>
  );
}
