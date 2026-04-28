'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  getCommissionAction,
  updateCommissionStatusAction,
  submitToDingtalkAction,
} from '@/lib/commissions/actions';
import { getAuthInfoAction } from '@/lib/auth/actions';
import { COMMISSION_STATUS_LABELS, COMMISSION_TYPE_LABELS } from '@/types/commission';
import type { CommissionStatus } from '@/types/commission';
import type { CommissionWithRelations } from '@/types/commission';

export default function CommissionDetailPage() {
  const params = useParams();
  const commissionId = params.id as string;

  const [commission, setCommission] = useState<CommissionWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [auth, setAuth] = useState<{ user_id: string; role: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [note, setNote] = useState('');
  const [pendingStatus, setPendingStatus] = useState<CommissionStatus | null>(null);

  const fetchCommission = async () => {
    setLoading(true);
    const result = await getCommissionAction(commissionId);
    if (result.success && result.data) {
      setCommission(result.data);
    } else {
      setError(result.error || '获取失败');
    }
    setLoading(false);
  };

  useEffect(() => {
    getAuthInfoAction().then((result) => {
      if (result.success && result.data) {
        setAuth(result.data);
      }
    });
    fetchCommission();
  }, [commissionId]);

  const handleStatusUpdate = async () => {
    if (!pendingStatus) return;

    setActionLoading(true);
    const result = await updateCommissionStatusAction({
      commission_id: commissionId,
      status: pendingStatus,
      note: note || undefined,
    });

    if (result.success) {
      setShowNoteModal(false);
      setNote('');
      setPendingStatus(null);
      fetchCommission();
    } else {
      setError(result.error || '更新失败');
    }
    setActionLoading(false);
  };

  const handleSubmitToDingtalk = async () => {
    setActionLoading(true);
    const result = await submitToDingtalkAction(commissionId);
    if (result.success) {
      fetchCommission();
    } else {
      setError(result.error || '提交失败');
    }
    setActionLoading(false);
  };

  const openStatusModal = (status: CommissionStatus) => {
    setPendingStatus(status);
    setNote('');
    setShowNoteModal(true);
  };

  const statusColors: Record<CommissionStatus, string> = {
    pending: 'bg-gray-100 text-gray-800',
    applied: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
  };

  const statusFlow: Record<CommissionStatus, { next: CommissionStatus; label: string; action: string } | null> = {
    pending: { next: 'applied', label: '申请提成', action: 'apply' },
    applied: { next: 'approved', label: '审批通过', action: 'approve' },
    approved: { next: 'paid', label: '确认支付', action: 'pay' },
    paid: null,
  };

  const canPerformAction = (action: string) => {
    if (!auth || !commission) return false;

    switch (action) {
      case 'apply':
        return auth.role === 'business' && commission.employee_id === auth.user_id && commission.status === 'pending';
      case 'approve':
      case 'pay':
        return auth.role === 'admin' || auth.role === 'gm';
      case 'dingtalk':
        return auth.role === 'business' && commission.employee_id === auth.user_id && commission.status === 'approved' && !commission.dingtalk_submitted_at;
      default:
        return false;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (error || !commission) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/commissions" className="p-2 hover:bg-gray-100 rounded-lg">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">提成详情</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          {error || '提成记录不存在'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/commissions" className="p-2 hover:bg-gray-100 rounded-lg">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">提成详情</h1>
            <p className="text-gray-500 mt-1">
              {commission.customer?.name} · {COMMISSION_TYPE_LABELS[commission.commission_type]}
            </p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[commission.status]}`}>
          {COMMISSION_STATUS_LABELS[commission.status]}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Commission Info */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">提成信息</h2>
          <dl className="space-y-4">
            <div className="flex justify-between">
              <dt className="text-gray-500">提成类型</dt>
              <dd className="font-medium">{COMMISSION_TYPE_LABELS[commission.commission_type]}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">提成金额</dt>
              <dd className="text-2xl font-bold text-indigo-600">
                ¥{commission.amount.toLocaleString()}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">状态</dt>
              <dd className="font-medium">{COMMISSION_STATUS_LABELS[commission.status]}</dd>
            </div>
            {commission.note && (
              <div>
                <dt className="text-gray-500 mb-1">备注</dt>
                <dd className="text-gray-700 bg-gray-50 rounded-lg p-3">{commission.note}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Customer Info */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">客户信息</h2>
          <dl className="space-y-4">
            <div className="flex justify-between">
              <dt className="text-gray-500">客户姓名</dt>
              <dd>
                <Link
                  href={`/customers/${commission.customer_id}`}
                  className="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  {commission.customer?.name || '未知'}
                </Link>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">联系电话</dt>
              <dd className="text-gray-900">{commission.customer?.phone || '无'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">品牌</dt>
              <dd className="text-gray-900">{commission.customer?.brand || '未知'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">装机容量</dt>
              <dd className="text-gray-900">{commission.customer?.capacity || '未知'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">当前阶段</dt>
              <dd className="text-gray-900">{commission.customer?.current_stage || '未知'}</dd>
            </div>
          </dl>
        </div>

        {/* Employee Info */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">员工信息</h2>
          <dl className="space-y-4">
            <div className="flex justify-between">
              <dt className="text-gray-500">员工姓名</dt>
              <dd className="font-medium">{commission.employee?.name || '未知'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">联系电话</dt>
              <dd className="text-gray-900">{commission.employee?.phone || '无'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">职位</dt>
              <dd className="text-gray-900">{commission.employee?.title || '未知'}</dd>
            </div>
          </dl>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">时间节点</h2>
          <dl className="space-y-4">
            <div className="flex justify-between">
              <dt className="text-gray-500">创建时间</dt>
              <dd className="text-gray-900">
                {new Date(commission.created_at).toLocaleString('zh-CN')}
              </dd>
            </div>
            {commission.applied_at && (
              <div className="flex justify-between">
                <dt className="text-gray-500">申请时间</dt>
                <dd className="text-gray-900">
                  {new Date(commission.applied_at).toLocaleString('zh-CN')}
                </dd>
              </div>
            )}
            {commission.approved_at && (
              <div className="flex justify-between">
                <dt className="text-gray-500">审批时间</dt>
                <dd className="text-gray-900">
                  {new Date(commission.approved_at).toLocaleString('zh-CN')}
                </dd>
              </div>
            )}
            {commission.paid_at && (
              <div className="flex justify-between">
                <dt className="text-gray-500">支付时间</dt>
                <dd className="text-gray-900">
                  {new Date(commission.paid_at).toLocaleString('zh-CN')}
                </dd>
              </div>
            )}
            {commission.dingtalk_submitted_at && (
              <div className="flex justify-between">
                <dt className="text-gray-500">钉钉提交</dt>
                <dd className="text-green-600">
                  {new Date(commission.dingtalk_submitted_at).toLocaleString('zh-CN')}
                </dd>
              </div>
            )}
          </dl>

          {/* Dingtalk Status */}
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">钉钉提交</div>
                <div className={`font-medium ${commission.dingtalk_submitted_at ? 'text-green-600' : 'text-gray-400'}`}>
                  {commission.dingtalk_submitted_at ? '已提交' : '未提交'}
                </div>
              </div>
              {canPerformAction('dingtalk') && (
                <button
                  onClick={handleSubmitToDingtalk}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {actionLoading ? '提交中...' : '提交钉钉'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      {statusFlow[commission.status] && canPerformAction(statusFlow[commission.status]!.action) && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">操作</h2>
          <button
            onClick={() => openStatusModal(statusFlow[commission.status]!.next)}
            disabled={actionLoading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {actionLoading ? '处理中...' : statusFlow[commission.status]!.label}
          </button>
        </div>
      )}

      {/* Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">添加备注</h3>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="可选，添加备注说明"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowNoteModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleStatusUpdate}
                disabled={actionLoading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {actionLoading ? '处理中...' : '确认'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
