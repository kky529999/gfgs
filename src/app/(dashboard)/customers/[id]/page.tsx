'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getCustomerAction,
  updateCustomerAction,
  advanceStageAction,
} from '@/lib/customers/actions';
import { getAuthInfoAction } from '@/lib/auth/actions';
import { STAGE_LABELS, STAGE_ORDER, CUSTOMER_TYPE_LABELS, type CustomerStage, type CustomerWithRelations } from '@/types/customer';

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [auth, setAuth] = useState<{ user_id: string; role: string } | null>(null);
  const [customer, setCustomer] = useState<CustomerWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'stage' | 'finance'>('info');

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  // Stage advance modal
  const [showStageModal, setShowStageModal] = useState(false);
  const [targetStage, setTargetStage] = useState<CustomerStage | null>(null);
  const [stageDate, setStageDate] = useState('');
  const [stageNote, setStageNote] = useState('');

  const loadCustomer = async () => {
    setLoading(true);
    const result = await getCustomerAction(id);
    if (result.success && result.data) {
      setCustomer(result.data);
      setEditForm({
        name: result.data.name,
        phone: result.data.phone || '',
        area: result.data.area || '',
        township: result.data.township || '',
        address: result.data.address || '',
        capacity: result.data.capacity || '',
        brand: result.data.brand || '',
        panel_count: result.data.panel_count?.toString() || '',
        house_type: result.data.house_type || '',
        customer_type: result.data.customer_type,
        dealer_id: result.data.dealer_id || '',
        salesperson_id: result.data.salesperson_id || '',
        tech_assigned_id: result.data.tech_assigned_id || '',
        survey_date: result.data.survey_date || '',
        design_date: result.data.design_date || '',
        filing_date: result.data.filing_date || '',
        record_date: result.data.record_date || '',
        grid_materials_date: result.data.grid_materials_date || '',
        ship_date: result.data.ship_date || '',
        grid_date: result.data.grid_date || '',
        close_date: result.data.close_date || '',
        user_acceptance_date: result.data.user_acceptance_date || '',
        project_company: result.data.project_company || '',
        construction_labor: result.data.construction_labor?.toString() || '',
        construction_material: result.data.construction_material?.toString() || '',
        construction_other: result.data.construction_other?.toString() || '',
      });
    } else {
      setError(result.error || '获取客户信息失败');
    }
    setLoading(false);
  };

  useEffect(() => {
    getAuthInfoAction().then((result) => {
      if (result.success && result.data) {
        setAuth(result.data);
      }
    });

    loadCustomer();
  }, [id]);

  const handleEditChange = (name: string, value: string) => {
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async () => {
    setSubmitting(true);
    setError('');

    const result = await updateCustomerAction(id, {
      name: editForm.name,
      phone: editForm.phone || undefined,
      area: editForm.area || undefined,
      township: editForm.township || undefined,
      address: editForm.address || undefined,
      capacity: editForm.capacity || undefined,
      brand: editForm.brand || undefined,
      panel_count: editForm.panel_count ? parseInt(editForm.panel_count) : undefined,
      house_type: editForm.house_type || undefined,
      customer_type: editForm.customer_type as 'direct' | 'dealer',
      dealer_id: editForm.dealer_id || undefined,
      salesperson_id: editForm.salesperson_id || undefined,
      tech_assigned_id: editForm.tech_assigned_id || undefined,
      survey_date: editForm.survey_date || undefined,
      design_date: editForm.design_date || undefined,
      filing_date: editForm.filing_date || undefined,
      record_date: editForm.record_date || undefined,
      grid_materials_date: editForm.grid_materials_date || undefined,
      ship_date: editForm.ship_date || undefined,
      grid_date: editForm.grid_date || undefined,
      close_date: editForm.close_date || undefined,
      user_acceptance_date: editForm.user_acceptance_date || undefined,
      project_company: editForm.project_company || undefined,
      construction_labor: editForm.construction_labor ? parseFloat(editForm.construction_labor) : undefined,
      construction_material: editForm.construction_material ? parseFloat(editForm.construction_material) : undefined,
      construction_other: editForm.construction_other ? parseFloat(editForm.construction_other) : undefined,
    });

    if (result.success) {
      setIsEditing(false);
      await loadCustomer();
    } else {
      setError(result.error || '保存失败');
    }
    setSubmitting(false);
  };

  const handleAdvanceStage = async () => {
    if (!targetStage) return;

    setSubmitting(true);
    const result = await advanceStageAction({
      customer_id: id,
      to_stage: targetStage,
      date: stageDate,
      note: stageNote,
    });

    if (result.success) {
      setShowStageModal(false);
      setTargetStage(null);
      setStageDate('');
      setStageNote('');
      await loadCustomer();
    } else {
      setError(result.error || '推进阶段失败');
    }
    setSubmitting(false);
  };

  const openStageModal = (stage: CustomerStage) => {
    setTargetStage(stage);
    setStageDate(new Date().toISOString().split('T')[0]);
    setStageNote('');
    setShowStageModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{error || '客户不存在'}</p>
        <Link href="/customers" className="mt-4 text-indigo-600 hover:underline">
          返回客户列表
        </Link>
      </div>
    );
  }

  const currentStageIndex = STAGE_ORDER.indexOf(customer.current_stage);
  const canEdit = auth?.role === 'admin' || auth?.role === 'gm' ||
    (auth?.role === 'business' && customer.salesperson_id === auth.user_id) ||
    (auth?.role === 'tech' && customer.tech_assigned_id === auth.user_id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
            <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
            <p className="text-gray-500 mt-1">
              {customer.phone || '无电话'} · {customer.area || '未知地区'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {canEdit && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              编辑信息
            </button>
          )}
          {isEditing && (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={submitting}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {submitting ? '保存中...' : '保存'}
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {(['info', 'stage', 'finance'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab === 'info' ? '基本信息' : tab === 'stage' ? '阶段进度' : '财务信息'}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        {activeTab === 'info' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">客户姓名</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => handleEditChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-gray-900">{customer.name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">联系电话</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => handleEditChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-gray-900">{customer.phone || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">地区</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.area}
                    onChange={(e) => handleEditChange('area', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-gray-900">{customer.area || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">乡镇/街道</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.township}
                    onChange={(e) => handleEditChange('township', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-gray-900">{customer.township || '-'}</p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-1">详细地址</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.address}
                    onChange={(e) => handleEditChange('address', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-gray-900">{customer.address || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">装机容量</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.capacity}
                    onChange={(e) => handleEditChange('capacity', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-gray-900">{customer.capacity || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">品牌</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.brand}
                    onChange={(e) => handleEditChange('brand', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-gray-900">{customer.brand || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">组件数量</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={editForm.panel_count}
                    onChange={(e) => handleEditChange('panel_count', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-gray-900">{customer.panel_count || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">房屋类型</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.house_type}
                    onChange={(e) => handleEditChange('house_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-gray-900">{customer.house_type || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">客户类型</label>
                <p className="text-gray-900">{CUSTOMER_TYPE_LABELS[customer.customer_type]}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">业务归属</label>
                <p className="text-gray-900">{customer.salesperson?.name || '未分配'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">技术归属</label>
                <p className="text-gray-900">{customer.tech_assigned?.name || '未分配'}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stage' && (
          <div className="space-y-6">
            {/* Stage Progress Header */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-500">当前阶段</span>
                <p className="text-2xl font-bold text-indigo-600">{STAGE_LABELS[customer.current_stage]}</p>
              </div>
              <div className="text-right">
                <span className="text-sm text-gray-500">进度</span>
                <p className="text-2xl font-bold text-gray-900">{currentStageIndex + 1}/{STAGE_ORDER.length}</p>
              </div>
            </div>

            {/* Stage Timeline */}
            <div className="relative">
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
              <div className="space-y-4">
                {STAGE_ORDER.map((stage, index) => {
                  const isCompleted = index < currentStageIndex;
                  const isCurrent = index === currentStageIndex;
                  const dateField = getStageDateField(stage);
                  const stageDate = customer[dateField as keyof CustomerWithRelations] as string | null;

                  return (
                    <div key={stage} className="relative flex items-start gap-4">
                      <div
                        className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${
                          isCompleted
                            ? 'bg-green-500 text-white'
                            : isCurrent
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {isCompleted ? (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          index + 1
                        )}
                      </div>
                      <div className="flex-1 pb-8">
                        <div className="flex items-center justify-between">
                          <h4 className={`font-medium ${isCurrent ? 'text-indigo-600' : 'text-gray-900'}`}>
                            {STAGE_LABELS[stage]}
                          </h4>
                          {canEdit && !isCompleted && (
                            <button
                              onClick={() => openStageModal(stage)}
                              className="text-sm text-indigo-600 hover:text-indigo-800"
                            >
                              标记完成
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {stageDate
                            ? new Date(stageDate).toLocaleDateString('zh-CN')
                            : isCompleted
                            ? '已完成'
                            : '待处理'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'finance' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">施工工费</label>
                {isEditing ? (
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.construction_labor}
                    onChange={(e) => handleEditChange('construction_labor', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-gray-900">
                    {customer.construction_labor ? `¥${customer.construction_labor.toFixed(2)}` : '-'}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">施工材料费</label>
                {isEditing ? (
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.construction_material}
                    onChange={(e) => handleEditChange('construction_material', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-gray-900">
                    {customer.construction_material ? `¥${customer.construction_material.toFixed(2)}` : '-'}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">其他费用</label>
                {isEditing ? (
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.construction_other}
                    onChange={(e) => handleEditChange('construction_other', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-gray-900">
                    {customer.construction_other ? `¥${customer.construction_other.toFixed(2)}` : '-'}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">提成状态</label>
                <p className="text-gray-900">{customer.commission_status}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">用户验收日期</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={editForm.user_acceptance_date}
                    onChange={(e) => handleEditChange('user_acceptance_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-gray-900">
                    {customer.user_acceptance_date
                      ? new Date(customer.user_acceptance_date).toLocaleDateString('zh-CN')
                      : '-'}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">项目公司</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.project_company}
                    onChange={(e) => handleEditChange('project_company', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-gray-900">{customer.project_company || '-'}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stage Advance Modal */}
      {showStageModal && targetStage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              标记「{STAGE_LABELS[targetStage]}」完成
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  完成日期
                </label>
                <input
                  type="date"
                  value={stageDate}
                  onChange={(e) => setStageDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  备注（可选）
                </label>
                <textarea
                  value={stageNote}
                  onChange={(e) => setStageNote(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="添加备注信息..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowStageModal(false);
                  setTargetStage(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleAdvanceStage}
                disabled={submitting}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? '提交中...' : '确认'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getStageDateField(stage: CustomerStage): string {
  const fields: Record<CustomerStage, string> = {
    survey: 'survey_date',
    design: 'design_date',
    filing: 'filing_date',
    record: 'record_date',
    grid_materials: 'grid_materials_date',
    ship: 'ship_date',
    grid: 'grid_date',
    close: 'close_date',
  };
  return fields[stage];
}