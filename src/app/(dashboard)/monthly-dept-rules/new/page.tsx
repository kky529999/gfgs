'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createDeptRulesAction, type CreateDeptRulesInput } from '@/lib/monthly-policies/actions';

const DEPT_OPTIONS = [
  { value: 'admin', label: '综合管理部' },
  { value: 'tech', label: '技术方案部' },
  { value: 'business', label: '业务开发部' },
];

// Get current and next 12 months for selection
function getYearMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const value = `${year}-${month}`;
    const label = `${year}年${date.getMonth() + 1}月`;
    options.push({ value, label });
  }
  return options;
}

export default function NewDeptRulesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<CreateDeptRulesInput>({
    department: '',
    year_month: new Date().toISOString().slice(0, 7),
    // Admin rewards
    admin_record_reward: 0,
    admin_grid_reward: 0,
    admin_close_reward: 0,
    admin_recruit_invite_reward: 0,
    admin_recruit_interview_reward: 0,
    admin_recruit_probation_reward: 0,
    admin_meeting_reward: 0,
    admin_video_reward: 0,
    admin_video_real_reward: 0,
    admin_live_reward: 0,
    // Admin penalties
    admin_record_penalty_days: 0,
    admin_record_penalty_per_day: 0,
    admin_grid_penalty_days: 0,
    admin_grid_penalty_days_other: 0,
    admin_grid_penalty_per_day: 0,
    // Tech rewards
    tech_survey_reward: 0,
    tech_survey_reward_dealer: 0,
    tech_design_own_reward: 0,
    tech_design_outsource_reward: 0,
    tech_grid_reward: 0,
    tech_grid_reward_dealer: 0,
    tech_warehouse_reward: 0,
    // Tech penalties
    tech_design_penalty_days: 0,
    tech_design_penalty_per_day: 0,
    tech_grid_penalty_days: 0,
    tech_grid_penalty_days_other: 0,
    tech_grid_penalty_per_day: 0,
    // Biz rewards
    biz_commission_per_panel: 0,
    biz_car_subsidy: 0,
    biz_bonus_target: 0,
    biz_bonus_if_met: 0,
    biz_supervisor_reward_per_panel: 0,
    // Biz penalties
    biz_min_ship_penalty: 0,
    biz_min_ship_count: 0,
    note: '',
  });

  const yearMonthOptions = getYearMonthOptions();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'number') {
      setFormData((prev) => ({
        ...prev,
        [name]: value === '' ? 0 : parseFloat(value) || 0,
      }));
    } else if (name === 'note') {
      setFormData((prev) => ({
        ...prev,
        [name]: value || undefined,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Basic validation
    if (!formData.department) {
      setError('请选择部门');
      setLoading(false);
      return;
    }
    if (!formData.year_month) {
      setError('请选择月份');
      setLoading(false);
      return;
    }

    const result = await createDeptRulesAction(formData);

    if (result.success) {
      router.push('/monthly-dept-rules');
      router.refresh();
    } else {
      setError(result.error || '创建失败');
    }

    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/monthly-dept-rules"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">新建月度部门规则</h1>
          <p className="text-gray-500 mt-1">配置各部门每月的奖励和考核规则</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">基本信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Year Month */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  月份 <span className="text-red-500">*</span>
                </label>
                <select
                  name="year_month"
                  value={formData.year_month}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {yearMonthOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  部门 <span className="text-red-500">*</span>
                </label>
                <select
                  name="department"
                  value={formData.department || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">选择部门</option>
                  {DEPT_OPTIONS.map((dept) => (
                    <option key={dept.value} value={dept.value}>
                      {dept.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Admin Section */}
          {(formData.department === 'admin' || !formData.department) && (
            <div className={formData.department === 'admin' ? '' : 'opacity-60'}>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                综合管理部配置
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">建档奖励（元）</label>
                  <input type="number" name="admin_record_reward" value={formData.admin_record_reward || 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">并网奖励（元）</label>
                  <input type="number" name="admin_grid_reward" value={formData.admin_grid_reward || 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">闭环奖励（元）</label>
                  <input type="number" name="admin_close_reward" value={formData.admin_close_reward || 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">招聘邀请奖励（元）</label>
                  <input type="number" name="admin_recruit_invite_reward" value={formData.admin_recruit_invite_reward || 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">招聘面试奖励（元）</label>
                  <input type="number" name="admin_recruit_interview_reward" value={formData.admin_recruit_interview_reward || 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">会议奖励（元）</label>
                  <input type="number" name="admin_meeting_reward" value={formData.admin_meeting_reward || 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">视频奖励（元）</label>
                  <input type="number" name="admin_video_reward" value={formData.admin_video_reward || 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">直播奖励（元）</label>
                  <input type="number" name="admin_live_reward" value={formData.admin_live_reward || 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">建档逾期天数</label>
                  <input type="number" name="admin_record_penalty_days" value={formData.admin_record_penalty_days || 0} onChange={handleChange} min="0" step="1" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">建档逾期每天扣（元）</label>
                  <input type="number" name="admin_record_penalty_per_day" value={formData.admin_record_penalty_per_day || 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">并网逾期天数(自)</label>
                  <input type="number" name="admin_grid_penalty_days" value={formData.admin_grid_penalty_days || 0} onChange={handleChange} min="0" step="1" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">并网逾期天数(他)</label>
                  <input type="number" name="admin_grid_penalty_days_other" value={formData.admin_grid_penalty_days_other || 0} onChange={handleChange} min="0" step="1" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
              </div>
            </div>
          )}

          {/* Tech Section */}
          {(formData.department === 'tech' || !formData.department) && (
            <div className={formData.department === 'tech' ? '' : 'opacity-60'}>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                技术方案部配置
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">现勘奖励（元）</label>
                  <input type="number" name="tech_survey_reward" value={formData.tech_survey_reward || 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">现勘奖励-二级商（元）</label>
                  <input type="number" name="tech_survey_reward_dealer" value={formData.tech_survey_reward_dealer || 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">自主设计奖励（元）</label>
                  <input type="number" name="tech_design_own_reward" value={formData.tech_design_own_reward || 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">外包设计奖励（元）</label>
                  <input type="number" name="tech_design_outsource_reward" value={formData.tech_design_outsource_reward || 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">并网奖励（元）</label>
                  <input type="number" name="tech_grid_reward" value={formData.tech_grid_reward || 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">并网奖励-二级商（元）</label>
                  <input type="number" name="tech_grid_reward_dealer" value={formData.tech_grid_reward_dealer || 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">仓储奖励（元）</label>
                  <input type="number" name="tech_warehouse_reward" value={formData.tech_warehouse_reward || 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">设计逾期天数</label>
                  <input type="number" name="tech_design_penalty_days" value={formData.tech_design_penalty_days || 0} onChange={handleChange} min="0" step="1" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">设计逾期每天扣（元）</label>
                  <input type="number" name="tech_design_penalty_per_day" value={formData.tech_design_penalty_per_day || 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">并网逾期天数(自)</label>
                  <input type="number" name="tech_grid_penalty_days" value={formData.tech_grid_penalty_days || 0} onChange={handleChange} min="0" step="1" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">并网逾期天数(他)</label>
                  <input type="number" name="tech_grid_penalty_days_other" value={formData.tech_grid_penalty_days_other || 0} onChange={handleChange} min="0" step="1" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
              </div>
            </div>
          )}

          {/* Business Section */}
          {(formData.department === 'business' || !formData.department) && (
            <div className={formData.department === 'business' ? '' : 'opacity-60'}>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                业务开发部配置
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">单块提成（元/块）</label>
                  <input type="number" name="biz_commission_per_panel" value={formData.biz_commission_per_panel || 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">车辆补贴（元/月）</label>
                  <input type="number" name="biz_car_subsidy" value={formData.biz_car_subsidy || 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">达标目标（块/月）</label>
                  <input type="number" name="biz_bonus_target" value={formData.biz_bonus_target || 0} onChange={handleChange} min="0" step="1" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">达标奖励（元）</label>
                  <input type="number" name="biz_bonus_if_met" value={formData.biz_bonus_if_met || 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">主管奖励（元/块）</label>
                  <input type="number" name="biz_supervisor_reward_per_panel" value={formData.biz_supervisor_reward_per_panel || 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">最低发货量（块）</label>
                  <input type="number" name="biz_min_ship_count" value={formData.biz_min_ship_count || 0} onChange={handleChange} min="0" step="1" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">低于最低发货量扣款（元）</label>
                  <input type="number" name="biz_min_ship_penalty" value={formData.biz_min_ship_penalty || 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
              </div>
            </div>
          )}

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">备注</label>
            <textarea
              name="note"
              value={formData.note || ''}
              onChange={handleChange}
              placeholder="输入备注信息（可选）"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
            <Link
              href="/monthly-dept-rules"
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {loading ? '创建中...' : '创建配置'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}