'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getCustomerAction,
  updateCustomerAction,
  advanceStageAction,
} from '@/lib/customers/actions';
import { getAuthInfoAction } from '@/lib/auth/actions';
import { getInvoicesAction, createInvoiceAction, deleteInvoiceAction } from '@/lib/invoices/actions';
import { STAGE_LABELS, STAGE_ORDER, CUSTOMER_TYPE_LABELS, type CustomerStage, type CustomerWithRelations } from '@/types/customer';
import type { Invoice, BrandPolicySnapshot } from '@/types';

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

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  // Stage advance modal
  const [showStageModal, setShowStageModal] = useState(false);
  const [targetStage, setTargetStage] = useState<CustomerStage | null>(null);
  const [stageDate, setStageDate] = useState('');
  const [stageNote, setStageNote] = useState('');

  // Invoice state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    invoice_no: '',
    amount: '',
    invoice_date: '',
    note: '',
  });

  const loadInvoices = async () => {
    setInvoicesLoading(true);
    const result = await getInvoicesAction({ customer_id: id });
    if (result.success && result.data) {
      setInvoices(result.data);
    }
    setInvoicesLoading(false);
  };

  const handleCreateInvoice = async () => {
    if (!invoiceForm.amount || !customer?.brand) return;
    setSubmitting(true);
    const result = await createInvoiceAction({
      customer_id: id,
      brand: customer.brand,
      invoice_no: invoiceForm.invoice_no || undefined,
      amount: parseFloat(invoiceForm.amount),
      invoice_date: invoiceForm.invoice_date || undefined,
      note: invoiceForm.note || undefined,
    });
    if (result.success) {
      setShowInvoiceForm(false);
      setInvoiceForm({ invoice_no: '', amount: '', invoice_date: '', note: '' });
      await loadInvoices();
    } else {
      setError(result.error || '创建发票失败');
    }
    setSubmitting(false);
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm('确定要删除这条发票记录吗？')) return;
    const result = await deleteInvoiceAction(invoiceId);
    if (result.success) {
      await loadInvoices();
    } else {
      setError(result.error || '删除发票失败');
    }
  };

  const handleSaveVoucher = async () => {
    setSubmitting(true);
    const result = await updateCustomerAction(id, {
      entry_voucher_url: voucherUrl || undefined,
    });
    if (result.success) {
      await loadCustomer();
      alert('进场凭证已保存');
    } else {
      setError(result.error || '保存失败');
    }
    setSubmitting(false);
  };

  const handleSaveClosingVideo = async () => {
    setSubmitting(true);
    const result = await updateCustomerAction(id, {
      closing_video_url: closingVideoUrl || undefined,
    });
    if (result.success) {
      await loadCustomer();
      alert('满意视频已保存');
    } else {
      setError(result.error || '保存失败');
    }
    setSubmitting(false);
  };

  // Calculate installment status
  const getInstallmentStatus = () => {
    if (!customer) return null;
    const hasEntryVoucher = !!customer.entry_voucher_url;
    const hasClosingVideo = !!customer.closing_video_url;
    const isClosed = customer.current_stage === 'close';

    // First installment (50%): when construction team enters (entry voucher uploaded)
    // Second installment (50%): when closed (closing video uploaded)
    const firstPaid = hasEntryVoucher;
    const secondPaid = hasClosingVideo && isClosed;

    return {
      hasEntryVoucher,
      hasClosingVideo,
      isClosed,
      firstPaid,
      secondPaid,
      totalProgress: firstPaid ? (secondPaid ? 100 : 50) : 0,
    };
  };

  // Profit calculation helpers (mirrored from profits/actions.ts)
  const GRID_DEADLINE_DAYS: Record<string, number> = { '天合': 43, '天合光能': 43 };
  const DEFAULT_GRID_DEADLINE_DAYS = 28;
  const parseGridPenaltyPerDay = (penaltyStr: string | null | undefined): number => {
    if (!penaltyStr) return 200;
    const match = penaltyStr.match(/(\d+)(?:元\/天|元\/天逾期)?/);
    return match ? parseInt(match[1], 10) : 200;
  };
  const calculateGridPenalty = (
    shipDate: string | null | undefined,
    gridDate: string | null | undefined,
    brand: string | null | undefined,
    gridPenaltyStr: string | null | undefined
  ): number => {
    if (!shipDate || !gridDate) return 0;
    const ship = new Date(shipDate);
    const grid = new Date(gridDate);
    if (grid <= ship) return 0;
    const diffTime = grid.getTime() - ship.getTime();
    const overdueDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const deadline = GRID_DEADLINE_DAYS[brand || ''] || DEFAULT_GRID_DEADLINE_DAYS;
    if (overdueDays <= deadline) return 0;
    const penaltyPerDay = parseGridPenaltyPerDay(gridPenaltyStr);
    const penaltyDays = overdueDays - deadline;
    return penaltyDays * penaltyPerDay;
  };

  // Calculate profit for this customer
  const calculateProfit = () => {
    if (!customer) return null;
    const policySnapshot = customer.policy_snapshot as BrandPolicySnapshot | null;
    const panelCount = customer.panel_count || 0;
    const installationFee = policySnapshot?.installation_fee || 0;
    const comprehensiveSubsidy = policySnapshot?.comprehensive_subsidy || 0;
    const channelFee = policySnapshot?.channel_fee || 0;
    const inspectionReward = policySnapshot?.inspection_reward || 0;
    const brandRevenue = (installationFee + comprehensiveSubsidy + channelFee) * panelCount + inspectionReward;
    const laborCost = customer.construction_labor || 0;
    const materialCost = customer.construction_material || 0;
    const otherCost = customer.construction_other || 0;
    const totalCost = laborCost + materialCost + otherCost;
    const gridPenalty = calculateGridPenalty(
      customer.ship_date,
      customer.grid_date,
      customer.brand,
      policySnapshot?.grid_penalty
    );
    const netProfit = brandRevenue - totalCost - gridPenalty;
    return { brandRevenue, totalCost, gridPenalty, netProfit };
  };

  const profit = calculateProfit();

  // File upload state
  const [voucherUrl, setVoucherUrl] = useState('');
  const [closingVideoUrl, setClosingVideoUrl] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);

  const loadCustomer = async () => {
    setLoading(true);
    const result = await getCustomerAction(id);
    if (result.success && result.data) {
      setCustomer(result.data);
      setVoucherUrl(result.data.entry_voucher_url || '');
      setClosingVideoUrl(result.data.closing_video_url || '');
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
    await loadInvoices();
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

      {/* Top Row: 基本信息 + 财务信息 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 基本信息 */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">基本信息</h2>
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

        {/* 财务信息 */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">财务信息</h2>
          <div className="space-y-4">
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
      </div>

      {/* 阶段进度 - 横向时间线 */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-sm text-gray-500">当前阶段</span>
            <p className="text-2xl font-bold text-indigo-600">{STAGE_LABELS[customer.current_stage]}</p>
          </div>
          <div className="text-right">
            <span className="text-sm text-gray-500">进度</span>
            <p className="text-2xl font-bold text-gray-900">{currentStageIndex + 1}/{STAGE_ORDER.length}</p>
          </div>
        </div>

        {/* Horizontal Stage Timeline */}
        <div className="relative overflow-x-auto pb-4 -mx-2 px-2">
          <div className="flex gap-2 min-w-max">
            {STAGE_ORDER.map((stage, index) => {
              const isCompleted = index < currentStageIndex;
              const isCurrent = index === currentStageIndex;
              const isPending = index > currentStageIndex;
              const dateField = getStageDateField(stage);
              const operatorField = getStageOperatorField(stage);
              const stageDate = customer[dateField as keyof CustomerWithRelations] as string | null;
              const stageOperator = customer[operatorField as keyof CustomerWithRelations] as { id: string; name: string; phone: string } | null;

              return (
                <div
                  key={stage}
                  className={`relative flex flex-col items-center w-36 ${isCurrent ? 'scale-105' : ''}`}
                >
                  {/* Connector line (before this node) */}
                  {index > 0 && (
                    <div
                      className={`absolute top-6 -left-2 w-8 h-0.5 ${
                        isCompleted || isCurrent ? 'bg-indigo-500' : 'bg-gray-200'
                      }`}
                    />
                  )}

                  {/* Stage number circle */}
                  <div
                    className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      isCompleted
                        ? 'bg-green-500 text-white ring-4 ring-green-100'
                        : isCurrent
                        ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 animate-pulse'
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

                  {/* Stage label */}
                  <h4 className={`mt-3 text-sm font-medium text-center ${
                    isCurrent ? 'text-indigo-600' : isCompleted ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {STAGE_LABELS[stage]}
                  </h4>

                  {/* Date input/display */}
                  <div className="mt-2 w-full">
                    {canEdit ? (
                      isCompleted ? (
                        // Show date and operator for completed stages
                        <div className="text-center">
                          <p className="text-xs text-gray-500">
                            {stageDate
                              ? new Date(stageDate).toLocaleDateString('zh-CN')
                              : '已完成'}
                          </p>
                          {stageOperator && (
                            <p className="text-xs text-green-600 mt-1">
                              {stageOperator.name}
                            </p>
                          )}
                        </div>
                      ) : isCurrent ? (
                        // Editable date for current stage
                        <div className="text-center">
                          <input
                            type="date"
                            value={stageDate || new Date().toISOString().split('T')[0]}
                            onChange={async (e) => {
                              const result = await advanceStageAction({
                                customer_id: id,
                                to_stage: stage,
                                date: e.target.value,
                              });
                              if (result.success) {
                                await loadCustomer();
                              }
                            }}
                            className="w-full px-2 py-1 text-xs border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 text-center"
                          />
                          <p className="text-xs text-gray-400 mt-1">
                            点击日期标记完成
                          </p>
                        </div>
                      ) : (
                        // Future stages - just show pending
                        <p className="text-xs text-center text-gray-400">待处理</p>
                      )
                    ) : (
                      // Non-editable view
                      <div className="text-center">
                        <p className="text-xs text-gray-500">
                          {stageDate
                            ? new Date(stageDate).toLocaleDateString('zh-CN')
                            : isCompleted
                            ? '已完成'
                            : '待处理'}
                        </p>
                        {stageOperator && (
                          <p className="text-xs text-gray-400 mt-1">
                            {stageOperator.name}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stage detail cards */}
        <div className="mt-6 border-t pt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">阶段详情</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STAGE_ORDER.map((stage, index) => {
              const isCompleted = index < currentStageIndex;
              const isCurrent = index === currentStageIndex;
              const dateField = getStageDateField(stage);
              const operatorField = getStageOperatorField(stage);
              const stageDate = customer[dateField as keyof CustomerWithRelations] as string | null;
              const stageOperator = customer[operatorField as keyof CustomerWithRelations] as { id: string; name: string; phone: string } | null;

              return (
                <div
                  key={stage}
                  className={`p-3 rounded-lg border ${
                    isCompleted
                      ? 'bg-green-50 border-green-200'
                      : isCurrent
                      ? 'bg-indigo-50 border-indigo-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isCurrent
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}>
                      {isCompleted ? (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span className={`text-sm font-medium ${
                      isCurrent ? 'text-indigo-700' : 'text-gray-700'
                    }`}>
                      {STAGE_LABELS[stage]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {stageDate
                      ? new Date(stageDate).toLocaleDateString('zh-CN')
                      : isCompleted
                      ? '已完成'
                      : '待处理'}
                  </p>
                  {stageOperator && (
                    <p className="text-xs text-green-600 mt-1">
                      负责人: {stageOperator.name}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 利润计算 */}
      {profit && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">利润计算</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">品牌收入</p>
              <p className="text-2xl font-bold text-green-600">¥{profit.brandRevenue.toFixed(2)}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">总成本</p>
              <p className="text-2xl font-bold text-red-600">¥{profit.totalCost.toFixed(2)}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">逾期罚金</p>
              <p className="text-2xl font-bold text-orange-600">¥{profit.gridPenalty.toFixed(2)}</p>
            </div>
            <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <p className="text-sm text-gray-500">净利润</p>
              <p className={`text-2xl font-bold ${profit.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ¥{profit.netProfit.toFixed(2)}
              </p>
            </div>
          </div>
          {customer?.policy_snapshot && (
            <div className="mt-4 p-3 bg-amber-50 rounded-lg text-sm text-amber-800">
              <p className="font-medium">政策快照已锁定</p>
              <p className="text-amber-700 mt-1">
                安装服务费: ¥{((customer.policy_snapshot as unknown) as BrandPolicySnapshot).installation_fee}/板 |
                综合补贴: ¥{((customer.policy_snapshot as unknown) as BrandPolicySnapshot).comprehensive_subsidy}/板 |
                渠道提点: ¥{((customer.policy_snapshot as unknown) as BrandPolicySnapshot).channel_fee}/板
              </p>
            </div>
          )}
        </div>
      )}

      {/* 发票列表 */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">发票记录</h2>
          {canEdit && (
            <button
              onClick={() => setShowInvoiceForm(true)}
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              添加发票
            </button>
          )}
        </div>

        {invoicesLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            暂无发票记录
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">
                    {invoice.invoice_no || '无票号'}
                  </p>
                  <p className="text-sm text-gray-500">
                    ¥{invoice.amount.toFixed(2)} | {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString('zh-CN') : '无日期'}
                    {invoice.note && ` | ${invoice.note}`}
                  </p>
                </div>
                {canEdit && (
                  <button
                    onClick={() => handleDeleteInvoice(invoice.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    删除
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Invoice Form Modal */}
        {showInvoiceForm && (
          <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h3 className="text-sm font-medium text-gray-700 mb-3">添加发票</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">发票号码</label>
                <input
                  type="text"
                  value={invoiceForm.invoice_no}
                  onChange={(e) => setInvoiceForm((p) => ({ ...p, invoice_no: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="可选"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">金额 (元)</label>
                <input
                  type="number"
                  step="0.01"
                  value={invoiceForm.amount}
                  onChange={(e) => setInvoiceForm((p) => ({ ...p, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="必填"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">开票日期</label>
                <input
                  type="date"
                  value={invoiceForm.invoice_date}
                  onChange={(e) => setInvoiceForm((p) => ({ ...p, invoice_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">备注</label>
                <input
                  type="text"
                  value={invoiceForm.note}
                  onChange={(e) => setInvoiceForm((p) => ({ ...p, note: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="可选"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowInvoiceForm(false)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleCreateInvoice}
                disabled={submitting || !invoiceForm.amount}
                className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? '保存中...' : '保存'}
              </button>
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

      {/* 凭证管理 */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">凭证管理</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 进场凭证 */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">进场凭证</h3>
              {customer?.entry_voucher_url && (
                <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                  已上传
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-3">
              施工队进场时上传（首期提成 50% 依据）
            </p>
            {canEdit ? (
              <>
                <input
                  type="url"
                  value={voucherUrl}
                  onChange={(e) => setVoucherUrl(e.target.value)}
                  placeholder="粘贴凭证链接（图片/视频URL）"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2"
                />
                <button
                  onClick={handleSaveVoucher}
                  disabled={submitting}
                  className="w-full px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? '保存中...' : '保存凭证'}
                </button>
              </>
            ) : (
              <p className="text-sm text-gray-400">无权编辑</p>
            )}
            {customer?.entry_voucher_url && (
              <a
                href={customer.entry_voucher_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm text-indigo-600 hover:underline"
              >
                查看凭证 →
              </a>
            )}
          </div>

          {/* 满意视频 */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">满意视频</h3>
              {customer?.closing_video_url && (
                <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                  已上传
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-3">
              闭环时上传（含初装补贴画面，二期提成 50% 依据）
            </p>
            {canEdit ? (
              <>
                <input
                  type="url"
                  value={closingVideoUrl}
                  onChange={(e) => setClosingVideoUrl(e.target.value)}
                  placeholder="粘贴视频链接"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2"
                />
                <button
                  onClick={handleSaveClosingVideo}
                  disabled={submitting}
                  className="w-full px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? '保存中...' : '保存视频链接'}
                </button>
              </>
            ) : (
              <p className="text-sm text-gray-400">无权编辑</p>
            )}
            {customer?.closing_video_url && (
              <a
                href={customer.closing_video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm text-indigo-600 hover:underline"
              >
                查看视频 →
              </a>
            )}
          </div>
        </div>
      </div>

      {/* 提成分期状态 */}
      {customer && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">提成进度</h2>
          {(() => {
            const status = getInstallmentStatus();
            if (!status) return null;
            return (
              <div className="space-y-4">
                {/* Progress bar */}
                <div className="relative">
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                      style={{ width: `${status.totalProgress}%` }}
                    />
                  </div>
                  <div className="absolute top-0 left-0 w-full h-full flex items-center justify-between px-2">
                    <span className="text-xs font-medium text-white">首期50%</span>
                    <span className="text-xs font-medium text-white">二期50%</span>
                  </div>
                </div>

                {/* Installment details */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className={`p-4 rounded-lg border ${
                    status.firstPaid ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        status.firstPaid ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-500'
                      }`}>
                        {status.firstPaid ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : '1'}
                      </div>
                      <span className="font-medium">首期提成 (50%)</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {status.firstPaid ? '✓ 已触发：进场凭证已上传' : '○ 待触发：上传进场凭证'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">施工队进场时发放</p>
                  </div>

                  <div className={`p-4 rounded-lg border ${
                    status.secondPaid ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        status.secondPaid ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-500'
                      }`}>
                        {status.secondPaid ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : '2'}
                      </div>
                      <span className="font-medium">二期提成 (50%)</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {status.secondPaid
                        ? '✓ 已触发：闭环完成+满意视频'
                        : status.hasClosingVideo && !status.isClosed
                        ? '△ 待闭环：视频已传，需完成闭环阶段'
                        : '○ 待触发：上传满意视频并完成闭环'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">闭环完成时发放</p>
                  </div>
                </div>

                {/* Settlement requirements */}
                <div className="mt-4 p-3 bg-amber-50 rounded-lg text-sm">
                  <p className="font-medium text-amber-800 mb-1">结算条件</p>
                  <ul className="text-amber-700 space-y-1">
                    <li>✓ 闭环完成</li>
                    <li className={status.hasClosingVideo ? 'text-green-600' : ''}>✓ 满意视频（含初装补贴画面）</li>
                    <li>✓ 钉钉提交审核</li>
                    <li>✓ 1% 增值税专票</li>
                  </ul>
                </div>
              </div>
            );
          })()}
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

function getStageOperatorField(stage: CustomerStage): string {
  const fields: Record<CustomerStage, string> = {
    survey: 'survey_operator',
    design: 'design_operator',
    filing: 'filing_operator',
    record: 'record_operator',
    grid_materials: 'grid_materials_operator',
    ship: 'ship_operator',
    grid: 'grid_operator',
    close: 'close_operator',
  };
  return fields[stage];
}
