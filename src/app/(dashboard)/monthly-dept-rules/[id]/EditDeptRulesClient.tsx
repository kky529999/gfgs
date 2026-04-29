'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updateDeptRulesAction, deleteDeptRulesAction, type UpdateDeptRulesInput } from '@/lib/monthly-policies/actions';
import type { MonthlyDeptRules } from '@/types';

const DEPT_LABELS: Record<string, string> = {
  admin: '综合管理部',
  tech: '技术方案部',
  business: '业务开发部',
};

interface EditDeptRulesClientProps {
  rules: MonthlyDeptRules;
}

export function EditDeptRulesClient({ rules }: EditDeptRulesClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<UpdateDeptRulesInput>({
    department: rules.department as 'admin' | 'tech' | 'business',
    year_month: rules.year_month,
    // Admin rewards
    admin_record_reward: rules.admin_record_reward,
    admin_grid_reward: rules.admin_grid_reward,
    admin_close_reward: rules.admin_close_reward,
    admin_recruit_invite_reward: rules.admin_recruit_invite_reward,
    admin_recruit_interview_reward: rules.admin_recruit_interview_reward,
    admin_recruit_probation_reward: rules.admin_recruit_probation_reward,
    admin_meeting_reward: rules.admin_meeting_reward,
    admin_video_reward: rules.admin_video_reward,
    admin_video_real_reward: rules.admin_video_real_reward,
    admin_live_reward: rules.admin_live_reward,
    // Admin penalties
    admin_record_penalty_days: rules.admin_record_penalty_days,
    admin_record_penalty_per_day: rules.admin_record_penalty_per_day,
    admin_grid_penalty_days: rules.admin_grid_penalty_days,
    admin_grid_penalty_days_other: rules.admin_grid_penalty_days_other,
    admin_grid_penalty_per_day: rules.admin_grid_penalty_per_day,
    // Tech rewards
    tech_survey_reward: rules.tech_survey_reward,
    tech_survey_reward_dealer: rules.tech_survey_reward_dealer,
    tech_design_own_reward: rules.tech_design_own_reward,
    tech_design_outsource_reward: rules.tech_design_outsource_reward,
    tech_grid_reward: rules.tech_grid_reward,
    tech_grid_reward_dealer: rules.tech_grid_reward_dealer,
    tech_warehouse_reward: rules.tech_warehouse_reward,
    // Tech penalties
    tech_design_penalty_days: rules.tech_design_penalty_days,
    tech_design_penalty_per_day: rules.tech_design_penalty_per_day,
    tech_grid_penalty_days: rules.tech_grid_penalty_days,
    tech_grid_penalty_days_other: rules.tech_grid_penalty_days_other,
    tech_grid_penalty_per_day: rules.tech_grid_penalty_per_day,
    // Biz rewards
    biz_commission_per_panel: rules.biz_commission_per_panel,
    biz_car_subsidy: rules.biz_car_subsidy,
    biz_bonus_target: rules.biz_bonus_target,
    biz_bonus_if_met: rules.biz_bonus_if_met,
    biz_supervisor_reward_per_panel: rules.biz_supervisor_reward_per_panel,
    // Biz penalties
    biz_min_ship_penalty: rules.biz_min_ship_penalty,
    biz_min_ship_count: rules.biz_min_ship_count,
    note: rules.note || '',
  });

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

    const result = await updateDeptRulesAction(rules.id, formData);

    if (result.success) {
      router.push('/monthly-dept-rules');
      router.refresh();
    } else {
      setError(result.error || '更新失败');
    }

    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除此配置吗？此操作不可撤销。')) {
      return;
    }

    setLoading(true);
    const result = await deleteDeptRulesAction(rules.id);

    if (result.success) {
      router.push('/monthly-dept-rules');
      router.refresh();
    } else {
      setError(result.error || '删除失败');
      setLoading(false);
    }
  };

  const deptLabel = DEPT_LABELS[rules.department] || rules.department;

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Current Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">部门：</span>
                <span className="text-gray-900 font-medium">{deptLabel}</span>
              </div>
              <div>
                <span className="text-gray-500">月份：</span>
                <span className="text-gray-900">{rules.year_month}</span>
              </div>
              <div>
                <span className="text-gray-500">创建人：</span>
                <span className="text-gray-900">{rules.creator?.name || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500">创建时间：</span>
                <span className="text-gray-900">{new Date(rules.created_at).toLocaleDateString('zh-CN')}</span>
              </div>
            </div>
          </div>

          {/* Admin Section */}
          {rules.department === 'admin' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                综合管理部配置
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">建档奖励（元）</label>
                  <input type="number" name="admin_record_reward" value={formData.admin_record_reward ?? 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">并网奖励（元）</label>
                  <input type="number" name="admin_grid_reward" value={formData.admin_grid_reward ?? 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">闭环奖励（元）</label>
                  <input type="number" name="admin_close_reward" value={formData.admin_close_reward ?? 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">招聘邀请奖励（元）</label>
                  <input type="number" name="admin_recruit_invite_reward" value={formData.admin_recruit_invite_reward ?? 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">招聘面试奖励（元）</label>
                  <input type="number" name="admin_recruit_interview_reward" value={formData.admin_recruit_interview_reward ?? 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">会议奖励（元）</label>
                  <input type="number" name="admin_meeting_reward" value={formData.admin_meeting_reward ?? 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">视频奖励（元）</label>
                  <input type="number" name="admin_video_reward" value={formData.admin_video_reward ?? 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">直播奖励（元）</label>
                  <input type="number" name="admin_live_reward" value={formData.admin_live_reward ?? 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">建档逾期天数</label>
                  <input type="number" name="admin_record_penalty_days" value={formData.admin_record_penalty_days ?? 0} onChange={handleChange} min="0" step="1" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">建档逾期每天扣（元）</label>
                  <input type="number" name="admin_record_penalty_per_day" value={formData.admin_record_penalty_per_day ?? 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">并网逾期天数(自)</label>
                  <input type="number" name="admin_grid_penalty_days" value={formData.admin_grid_penalty_days ?? 0} onChange={handleChange} min="0" step="1" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">并网逾期天数(他)</label>
                  <input type="number" name="admin_grid_penalty_days_other" value={formData.admin_grid_penalty_days_other ?? 0} onChange={handleChange} min="0" step="1" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
              </div>
            </div>
          )}

          {/* Tech Section */}
          {rules.department === 'tech' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                技术方案部配置
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">现勘奖励（元）</label>
                  <input type="number" name="tech_survey_reward" value={formData.tech_survey_reward ?? 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">现勘奖励-二级商（元）</label>
                  <input type="number" name="tech_survey_reward_dealer" value={formData.tech_survey_reward_dealer ?? 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">自主设计奖励（元）</label>
                  <input type="number" name="tech_design_own_reward" value={formData.tech_design_own_reward ?? 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">外包设计奖励（元）</label>
                  <input type="number" name="tech_design_outsource_reward" value={formData.tech_design_outsource_reward ?? 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">并网奖励（元）</label>
                  <input type="number" name="tech_grid_reward" value={formData.tech_grid_reward ?? 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">并网奖励-二级商（元）</label>
                  <input type="number" name="tech_grid_reward_dealer" value={formData.tech_grid_reward_dealer ?? 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">仓储奖励（元）</label>
                  <input type="number" name="tech_warehouse_reward" value={formData.tech_warehouse_reward ?? 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">设计逾期天数</label>
                  <input type="number" name="tech_design_penalty_days" value={formData.tech_design_penalty_days ?? 0} onChange={handleChange} min="0" step="1" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">设计逾期每天扣（元）</label>
                  <input type="number" name="tech_design_penalty_per_day" value={formData.tech_design_penalty_per_day ?? 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">并网逾期天数(自)</label>
                  <input type="number" name="tech_grid_penalty_days" value={formData.tech_grid_penalty_days ?? 0} onChange={handleChange} min="0" step="1" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">并网逾期天数(他)</label>
                  <input type="number" name="tech_grid_penalty_days_other" value={formData.tech_grid_penalty_days_other ?? 0} onChange={handleChange} min="0" step="1" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
              </div>
            </div>
          )}

          {/* Business Section */}
          {rules.department === 'business' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                业务开发部配置
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">单块提成（元/块）</label>
                  <input type="number" name="biz_commission_per_panel" value={formData.biz_commission_per_panel ?? 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">车辆补贴（元/月）</label>
                  <input type="number" name="biz_car_subsidy" value={formData.biz_car_subsidy ?? 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">达标目标（块/月）</label>
                  <input type="number" name="biz_bonus_target" value={formData.biz_bonus_target ?? 0} onChange={handleChange} min="0" step="1" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">达标奖励（元）</label>
                  <input type="number" name="biz_bonus_if_met" value={formData.biz_bonus_if_met ?? 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">主管奖励（元/块）</label>
                  <input type="number" name="biz_supervisor_reward_per_panel" value={formData.biz_supervisor_reward_per_panel ?? 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">最低发货量（块）</label>
                  <input type="number" name="biz_min_ship_count" value={formData.biz_min_ship_count ?? 0} onChange={handleChange} min="0" step="1" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">低于最低发货量扣款（元）</label>
                  <input type="number" name="biz_min_ship_penalty" value={formData.biz_min_ship_penalty ?? 0} onChange={handleChange} min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
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
          <div className="flex justify-between pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="px-6 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              删除配置
            </button>
            <div className="flex gap-4">
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
                {loading ? '保存中...' : '保存修改'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}