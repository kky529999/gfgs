'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  createCustomerAction,
  getEmployeesAction,
  getDealersAction,
} from '@/lib/customers/actions';
import { getBrands } from '@/lib/brands/actions';
import { getAuthInfoAction } from '@/lib/auth/actions';
import type { CustomerType, SchemeType } from '@/types/customer';
import type { Brand } from '@/lib/brands/actions';

// 陕西省城市和区县数据
const SHAANXI_CITIES: Record<string, string[]> = {
  '宝鸡市': ['渭滨区', '金台区', '陈仓区', '凤翔区', '岐山县', '眉县', '扶风县', '凤县', '陇县', '千阳县', '麟游县', '太白县'],
  '西安市': ['新城区', '碑林区', '莲湖区', '雁塔区', '灞桥区', '未央区', '阎良区', '临潼区', '长安区', '高陵区', '鄠邑区', '蓝田县', '周至县'],
  '咸阳市': ['秦都区', '渭城区', '杨陵区', '兴平市', '武功县', '乾县', '礼泉县', '泾阳县', '三原县', '彬州市', '长武县', '旬邑县', '淳化县'],
  '渭南市': ['临渭区', '华州区', '韩城市', '华阴市', '潼关县', '大荔县', '合阳县', '澄城县', '蒲城县', '白水县', '富平县'],
  '铜川市': ['王益区', '印台区', '耀州区', '宜君县'],
  '延安市': ['宝塔区', '安塞区', '子长市', '延长县', '延川县', '志丹县', '吴起县', '甘泉县', '富县', '洛川县', '宜川县', '黄龙县', '黄陵县'],
  '榆林市': ['榆阳区', '横山区', '神木市', '府谷县', '靖边县', '定边县', '绥德县', '米脂县', '佳县', '吴堡县', '清涧县', '子洲县'],
  '汉中市': ['汉台区', '南郑区', '城固县', '洋县', '西乡县', '勉县', '宁强县', '略阳县', '镇巴县', '留坝县', '佛坪县'],
  '安康市': ['汉滨区', '汉阴县', '石泉县', '宁陕县', '紫阳县', '岚皋县', '平利县', '镇坪县', '旬阳县', '白河县'],
  '商洛市': ['商州区', '洛南县', '丹凤县', '商南县', '山阳县', '镇安县', '柞水县'],
};

const CITY_OPTIONS = Object.keys(SHAANXI_CITIES);

interface Employee {
  id: string;
  name: string;
  phone: string;
  department_code: string | null;
  title: string;
}

interface Dealer {
  id: string;
  name: string;
}

interface FormData {
  name: string;
  phone: string;
  // 地址三级联动
  address_city: string;
  address_district: string;
  address_detail: string;
  capacity: string;
  brand: string;
  panel_count: string;
  house_type: string;
  customer_type: CustomerType;
  dealer_id: string;
  salesperson_id: string;
  tech_assigned_id: string;
  // 计划现勘日期
  survey_date: string;
  // 方案类型
  scheme_type: SchemeType | '';
}

export default function NewCustomerPage() {
  const router = useRouter();
  const [auth, setAuth] = useState<{ user_id: string; role: string } | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    address_city: '',
    address_district: '',
    address_detail: '',
    capacity: '',
    brand: '',
    panel_count: '',
    house_type: '',
    customer_type: 'direct',
    dealer_id: '',
    salesperson_id: '',
    tech_assigned_id: '',
    survey_date: new Date().toISOString().split('T')[0],
    scheme_type: '',
  });

  const [districtOptions, setDistrictOptions] = useState<string[]>([]);

  // 城市变更时更新区县选项
  useEffect(() => {
    if (formData.address_city && SHAANXI_CITIES[formData.address_city]) {
      setDistrictOptions(SHAANXI_CITIES[formData.address_city]);
      // 如果当前选中的区县不在新的列表中，清空它
      if (formData.address_district && !SHAANXI_CITIES[formData.address_city].includes(formData.address_district)) {
        setFormData(prev => ({ ...prev, address_district: '' }));
      }
    } else {
      setDistrictOptions([]);
    }
  }, [formData.address_city]);

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

    // Load brands for dropdown
    getBrands().then((result) => {
      if (result.data) {
        setBrands(result.data);
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

    // 验证必填字段
    if (!formData.phone.trim()) {
      setError('请填写联系电话');
      return;
    }
    if (!formData.address_city || !formData.address_district) {
      setError('请选择完整的地址（城市和区县）');
      return;
    }

    setSubmitting(true);

    try {
      const result = await createCustomerAction({
        name: formData.name,
        phone: formData.phone,
        address_city: formData.address_city || undefined,
        address_district: formData.address_district || undefined,
        address_detail: formData.address_detail || undefined,
        capacity: formData.capacity || undefined,
        brand: formData.brand || undefined,
        panel_count: formData.panel_count ? parseInt(formData.panel_count) : undefined,
        house_type: formData.house_type || undefined,
        customer_type: formData.customer_type,
        dealer_id: formData.dealer_id || undefined,
        salesperson_id: formData.salesperson_id || undefined,
        tech_assigned_id: formData.tech_assigned_id || undefined,
        survey_date: formData.survey_date,
        scheme_type: formData.scheme_type || undefined,
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
                  联系电话 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="请输入联系电话"
                />
              </div>

              {/* 地址三级联动 - 第一级：城市 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  城市 <span className="text-red-500">*</span>
                </label>
                <select
                  name="address_city"
                  value={formData.address_city}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">请选择城市</option>
                  {CITY_OPTIONS.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              {/* 地址三级联动 - 第二级：区县 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  区县 <span className="text-red-500">*</span>
                </label>
                <select
                  name="address_district"
                  value={formData.address_district}
                  onChange={handleChange}
                  required
                  disabled={!formData.address_city}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">请选择区县</option>
                  {districtOptions.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </div>

              {/* 地址三级联动 - 第三级：详细地址 */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  详细地址
                </label>
                <input
                  type="text"
                  name="address_detail"
                  value={formData.address_detail}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="请输入详细地址（如：XX街道XX小区XX栋XX室）"
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
                  方案类型
                </label>
                <select
                  name="scheme_type"
                  value={formData.scheme_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">请选择方案类型</option>
                  <option value="courtyard">庭院式</option>
                  <option value="array">阵列式</option>
                  <option value="sunroom">阳光房</option>
                </select>
              </div>

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
                <select
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">请选择品牌</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.brand_name}>
                      {brand.brand_name}
                    </option>
                  ))}
                </select>
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
                  客户归属
                </label>
                <select
                  name="customer_type"
                  value={formData.customer_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="direct">直营</option>
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
                      业务经理
                    </label>
                    <select
                      name="salesperson_id"
                      value={formData.salesperson_id}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">请选择业务经理</option>
                      {employees
                        .filter((e) => e.department_code === 'business')
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
                        .filter((e) => e.department_code === 'tech')
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
                  计划现勘日期
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