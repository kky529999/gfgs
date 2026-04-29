'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { MonthlyDeptRules } from '@/types';

interface DeptRulesListClientProps {
  rules: MonthlyDeptRules[];
}

const DEPT_LABELS: Record<string, string> = {
  admin: '综合管理部',
  tech: '技术方案部',
  business: '业务开发部',
};

const DEPT_COLORS: Record<string, string> = {
  admin: 'bg-blue-100 text-blue-800',
  tech: 'bg-green-100 text-green-800',
  business: 'bg-purple-100 text-purple-800',
};

export function DeptRulesListClient({ rules }: DeptRulesListClientProps) {
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [yearMonthFilter, setYearMonthFilter] = useState('all');
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});

  // Get unique departments and year_months for filters
  const departments = Array.from(new Set(rules.map((r) => r.department)));
  const yearMonths = Array.from(new Set(rules.map((r) => r.year_month))).sort().reverse();

  // Filter rules
  const filteredRules = rules.filter((rule) => {
    const matchesDept = deptFilter === 'all' || rule.department === deptFilter;
    const matchesYearMonth = yearMonthFilter === 'all' || rule.year_month === yearMonthFilter;
    const matchesSearch = !search ||
      rule.department.toLowerCase().includes(search.toLowerCase()) ||
      (rule.note && rule.note.toLowerCase().includes(search.toLowerCase()));
    return matchesDept && matchesYearMonth && matchesSearch;
  });

  // Group by year_month
  const groupedRules = filteredRules.reduce((acc, rule) => {
    if (!acc[rule.year_month]) {
      acc[rule.year_month] = [];
    }
    acc[rule.year_month].push(rule);
    return acc;
  }, {} as Record<string, MonthlyDeptRules[]>);

  // Stats
  const totalRules = rules.length;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthRules = rules.filter((r) => r.year_month === currentMonth).length;

  const formatYearMonth = (ym: string) => {
    const [year, month] = ym.split('-');
    return `${year}年${parseInt(month, 10)}月`;
  };

  const toggleDept = (dept: string) => {
    setExpandedDepts((prev) => ({
      ...prev,
      [dept]: !prev[dept],
    }));
  };

  const getAdminSummary = (rule: MonthlyDeptRules) => {
    const rewards = [
      rule.admin_record_reward > 0 ? `建档:${rule.admin_record_reward}` : null,
      rule.admin_grid_reward > 0 ? `并网:${rule.admin_grid_reward}` : null,
      rule.admin_close_reward > 0 ? `闭环:${rule.admin_close_reward}` : null,
      rule.admin_video_reward > 0 ? `视频:${rule.admin_video_reward}` : null,
    ].filter(Boolean);
    return rewards.length > 0 ? rewards.join(' | ') : '无奖励';
  };

  const getTechSummary = (rule: MonthlyDeptRules) => {
    const rewards = [
      rule.tech_survey_reward > 0 ? `现勘:${rule.tech_survey_reward}` : null,
      rule.tech_design_own_reward > 0 ? `自设计:${rule.tech_design_own_reward}` : null,
      rule.tech_design_outsource_reward > 0 ? `外设计:${rule.tech_design_outsource_reward}` : null,
      rule.tech_grid_reward > 0 ? `并网:${rule.tech_grid_reward}` : null,
    ].filter(Boolean);
    return rewards.length > 0 ? rewards.join(' | ') : '无奖励';
  };

  const getBizSummary = (rule: MonthlyDeptRules) => {
    const rewards = [
      rule.biz_commission_per_panel > 0 ? `单块提成:${rule.biz_commission_per_panel}元` : null,
      rule.biz_car_subsidy > 0 ? `车补:${rule.biz_car_subsidy}元` : null,
      rule.biz_bonus_target > 0 ? `达标目标:${rule.biz_bonus_target}块` : null,
      rule.biz_bonus_if_met > 0 ? `达标奖励:${rule.biz_bonus_if_met}元` : null,
    ].filter(Boolean);
    return rewards.length > 0 ? rewards.join(' | ') : '无奖励';
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">配置总数</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{totalRules}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">本月配置</div>
          <div className="text-2xl font-bold text-indigo-600 mt-1">{currentMonthRules}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">涉及部门</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{departments.length}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="搜索备注..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Year Month Filter */}
            <select
              value={yearMonthFilter}
              onChange={(e) => setYearMonthFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">全部月份</option>
              {yearMonths.map((ym) => (
                <option key={ym} value={ym}>
                  {formatYearMonth(ym)}
                </option>
              ))}
            </select>

            {/* Department Filter */}
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">全部部门</option>
              {Object.entries(DEPT_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Rules by Month */}
        <div className="p-4 space-y-6">
          {Object.keys(groupedRules).length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无月度部门规则配置数据</div>
          ) : (
            Object.entries(groupedRules).map(([yearMonth, monthRules]) => {
              const isCurrentMonth = yearMonth === currentMonth;
              return (
                <div key={yearMonth} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Month Header */}
                  <div className={`px-4 py-3 ${isCurrentMonth ? 'bg-indigo-50' : 'bg-gray-50'} flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isCurrentMonth ? 'bg-indigo-200 text-indigo-800' : 'bg-gray-200 text-gray-800'
                      }`}>
                        {formatYearMonth(yearMonth)}
                      </span>
                      <span className="text-sm text-gray-500">{monthRules.length} 个部门配置</span>
                    </div>
                  </div>

                  {/* Dept Rules */}
                  <div className="divide-y divide-gray-100">
                    {monthRules.map((rule) => {
                      const deptLabel = DEPT_LABELS[rule.department] || rule.department;
                      const deptColor = DEPT_COLORS[rule.department] || 'bg-gray-100 text-gray-800';
                      const isExpanded = expandedDepts[rule.id] || false;

                      return (
                        <div key={rule.id} className="p-4">
                          {/* Rule Header */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${deptColor}`}>
                                {deptLabel}
                              </span>
                              {rule.note && (
                                <span className="text-sm text-gray-500">{rule.note}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/monthly-dept-rules/${rule.id}`}
                                className="inline-flex items-center px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition-colors"
                              >
                                详情/编辑
                              </Link>
                              <button
                                onClick={() => toggleDept(rule.id)}
                                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                              >
                                <svg className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          {/* Expanded Details */}
                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                              {rule.department === 'admin' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">奖励配置</h4>
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">建档奖励</span>
                                        <span className="text-gray-900">¥{rule.admin_record_reward}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">并网奖励</span>
                                        <span className="text-gray-900">¥{rule.admin_grid_reward}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">闭环奖励</span>
                                        <span className="text-gray-900">¥{rule.admin_close_reward}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">招聘邀请奖励</span>
                                        <span className="text-gray-900">¥{rule.admin_recruit_invite_reward}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">招聘面试奖励</span>
                                        <span className="text-gray-900">¥{rule.admin_recruit_interview_reward}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">会议奖励</span>
                                        <span className="text-gray-900">¥{rule.admin_meeting_reward}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">视频奖励</span>
                                        <span className="text-gray-900">¥{rule.admin_video_reward}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">直播奖励</span>
                                        <span className="text-gray-900">¥{rule.admin_live_reward}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">考核配置</h4>
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">建档逾期天数/元</span>
                                        <span className="text-gray-900">{rule.admin_record_penalty_days}天 / ¥{rule.admin_record_penalty_per_day}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">并网逾期天数(自)/元</span>
                                        <span className="text-gray-900">{rule.admin_grid_penalty_days}天 / ¥{rule.admin_grid_penalty_per_day}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">并网逾期天数(他)/元</span>
                                        <span className="text-gray-900">{rule.admin_grid_penalty_days_other}天 / ¥{rule.admin_grid_penalty_per_day}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                              {rule.department === 'tech' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">奖励配置</h4>
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">现勘奖励</span>
                                        <span className="text-gray-900">¥{rule.tech_survey_reward}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">现勘奖励(二级商)</span>
                                        <span className="text-gray-900">¥{rule.tech_survey_reward_dealer}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">自主设计奖励</span>
                                        <span className="text-gray-900">¥{rule.tech_design_own_reward}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">外包设计奖励</span>
                                        <span className="text-gray-900">¥{rule.tech_design_outsource_reward}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">并网奖励</span>
                                        <span className="text-gray-900">¥{rule.tech_grid_reward}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">并网奖励(二级商)</span>
                                        <span className="text-gray-900">¥{rule.tech_grid_reward_dealer}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">仓储奖励</span>
                                        <span className="text-gray-900">¥{rule.tech_warehouse_reward}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">考核配置</h4>
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">设计逾期天数/元</span>
                                        <span className="text-gray-900">{rule.tech_design_penalty_days}天 / ¥{rule.tech_design_penalty_per_day}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">并网逾期天数(自)/元</span>
                                        <span className="text-gray-900">{rule.tech_grid_penalty_days}天 / ¥{rule.tech_grid_penalty_per_day}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">并网逾期天数(他)/元</span>
                                        <span className="text-gray-900">{rule.tech_grid_penalty_days_other}天 / ¥{rule.tech_grid_penalty_per_day}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                              {rule.department === 'business' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">奖励配置</h4>
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">单块提成</span>
                                        <span className="text-gray-900">¥{rule.biz_commission_per_panel}/块</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">车辆补贴</span>
                                        <span className="text-gray-900">¥{rule.biz_car_subsidy}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">达标目标</span>
                                        <span className="text-gray-900">{rule.biz_bonus_target}块</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">达标奖励</span>
                                        <span className="text-gray-900">¥{rule.biz_bonus_if_met}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">主管奖励(每块)</span>
                                        <span className="text-gray-900">¥{rule.biz_supervisor_reward_per_panel}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">考核配置</h4>
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">最低发货考核/元</span>
                                        <span className="text-gray-900">{rule.biz_min_ship_count}块以下 ¥{rule.biz_min_ship_penalty}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                              <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-500">
                                创建人：{rule.creator?.name || '-'} | 创建时间：{new Date(rule.created_at).toLocaleDateString('zh-CN')}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Summary */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
          显示 {filteredRules.length} / {totalRules} 条配置
        </div>
      </div>
    </div>
  );
}