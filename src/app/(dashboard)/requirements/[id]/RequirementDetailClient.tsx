'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getRequirementAction,
  updateRequirementAction,
  confirmRequirementAction,
  rejectRequirementAction,
} from '@/lib/requirements/actions';
import { getEmployeesAction } from '@/lib/employees/actions';
import type { Requirement, Employee, RequirementStatus } from '@/types';

interface RequirementDetailClientProps {
  requirement: Requirement;
  currentUserId: string;
  currentUserRole: string;
}

export default function RequirementDetailClient({
  requirement: initialRequirement,
  currentUserId,
  currentUserRole,
}: RequirementDetailClientProps) {
  const [requirement, setRequirement] = useState<Requirement>(initialRequirement);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Edit form state
  const [isEditing, setIsEditing] = useState(false);
  const [editStatus, setEditStatus] = useState<RequirementStatus>(initialRequirement.status);
  const [editResponse, setEditResponse] = useState(initialRequirement.response || '');
  const [editAssignedTo, setEditAssignedTo] = useState<string>(initialRequirement.assigned_to || '');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const isAdminOrGM = currentUserRole === 'admin' || currentUserRole === 'gm';
  const isSubmitter = requirement.submitter_id === currentUserId;
  const isAssigned = requirement.assigned_to === currentUserId;
  const canEdit = isAdminOrGM || isAssigned;

  useEffect(() => {
    if (isAdminOrGM) {
      getEmployeesAction().then((result) => {
        if (result.success && result.data) {
          setEmployees(result.data);
        }
      });
    }
  }, [isAdminOrGM]);

  const refreshRequirement = async () => {
    const result = await getRequirementAction(requirement.id);
    if (result.success && result.data) {
      setRequirement(result.data);
      setEditStatus(result.data.status);
      setEditResponse(result.data.response || '');
      setEditAssignedTo(result.data.assigned_to || '');
    }
  };

  const handleSaveEdit = async () => {
    setLoading(true);
    setMessage(null);

    const result = await updateRequirementAction(requirement.id, {
      status: editStatus,
      response: editResponse || undefined,
      assigned_to: editAssignedTo || null,
    });

    if (result.success) {
      setMessage({ type: 'success', text: '更新成功' });
      setIsEditing(false);
      await refreshRequirement();
    } else {
      setMessage({ type: 'error', text: result.error || '更新失败' });
    }

    setLoading(false);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setMessage({ type: 'error', text: '请填写拒绝原因' });
      return;
    }

    setLoading(true);
    setMessage(null);

    const result = await rejectRequirementAction(requirement.id, rejectReason);

    if (result.success) {
      setMessage({ type: 'success', text: '已拒绝该需求' });
      setShowRejectForm(false);
      setRejectReason('');
      await refreshRequirement();
    } else {
      setMessage({ type: 'error', text: result.error || '拒绝失败' });
    }

    setLoading(false);
  };

  const handleConfirm = async (satisfied: boolean) => {
    setLoading(true);
    setMessage(null);

    const result = await confirmRequirementAction(requirement.id, satisfied);

    if (result.success) {
      setMessage({
        type: 'success',
        text: satisfied ? '已确认完成，感谢您的反馈！' : '已反馈，请继续改进',
      });
      await refreshRequirement();
    } else {
      setMessage({ type: 'error', text: result.error || '操作失败' });
    }

    setLoading(false);
  };

  const getStatusConfig = (status: RequirementStatus) => {
    const config: Record<RequirementStatus, { label: string; className: string }> = {
      submitted: { label: '待处理', className: 'bg-gray-100 text-gray-700' },
      in_progress: { label: '处理中', className: 'bg-blue-100 text-blue-700' },
      completed: { label: '已完成', className: 'bg-green-100 text-green-700' },
      confirmed: { label: '已确认', className: 'bg-purple-100 text-purple-700' },
      rejected: { label: '已拒绝', className: 'bg-red-100 text-red-700' },
    };
    return config[status];
  };

  const getTypeConfig = (type: string) => {
    const config: Record<string, { label: string; className: string }> = {
      feedback: { label: '反馈建议', className: 'bg-amber-100 text-amber-700' },
      bug: { label: '系统问题', className: 'bg-red-100 text-red-700' },
      feature: { label: '功能需求', className: 'bg-blue-100 text-blue-700' },
    };
    return config[type] || config.feedback;
  };

  const getPriorityConfig = (priority: string) => {
    const config: Record<string, { label: string; className: string }> = {
      low: { label: '低', className: 'text-gray-500' },
      medium: { label: '中', className: 'text-blue-500' },
      high: { label: '高', className: 'text-orange-500' },
      urgent: { label: '紧急', className: 'text-red-500 font-bold' },
    };
    return config[priority] || config.medium;
  };

  const statusConfig = getStatusConfig(requirement.status);
  const typeConfig = getTypeConfig(requirement.type);
  const priorityConfig = getPriorityConfig(requirement.priority);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/requirements"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回列表
        </Link>
        {canEdit && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            编辑
          </button>
        )}
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {/* Main Content */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-6">
        {/* Title & Badges */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-2 py-1 rounded text-xs ${typeConfig.className}`}>
              {typeConfig.label}
            </span>
            <span className={`px-2 py-1 rounded text-xs ${priorityConfig.className}`}>
              {priorityConfig.label}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.className}`}>
              {statusConfig.label}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{requirement.title}</h1>
        </div>

        {/* Meta Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">提交人：</span>
            <span className="text-gray-900">{requirement.submitter_name || '未知'}</span>
          </div>
          <div>
            <span className="text-gray-500">提交时间：</span>
            <span className="text-gray-900">
              {new Date(requirement.created_at).toLocaleString('zh-CN')}
            </span>
          </div>
          {requirement.assigned_name && (
            <div>
              <span className="text-gray-500">处理人：</span>
              <span className="text-gray-900">{requirement.assigned_name}</span>
            </div>
          )}
          {requirement.completed_at && (
            <div>
              <span className="text-gray-500">完成时间：</span>
              <span className="text-gray-900">
                {new Date(requirement.completed_at).toLocaleString('zh-CN')}
              </span>
            </div>
          )}
          {requirement.confirmed_at && (
            <div>
              <span className="text-gray-500">确认时间：</span>
              <span className="text-gray-900">
                {new Date(requirement.confirmed_at).toLocaleString('zh-CN')}
              </span>
            </div>
          )}
        </div>

        {/* Description */}
        {requirement.description && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">详细描述</h3>
            <div className="bg-gray-50 rounded-lg p-4 text-gray-700 whitespace-pre-wrap">
              {requirement.description}
            </div>
          </div>
        )}

        {/* Response */}
        {requirement.response && !isEditing && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">处理记录</h3>
            <div className="bg-blue-50 rounded-lg p-4 text-gray-700 whitespace-pre-wrap">
              {requirement.response}
            </div>
          </div>
        )}
      </div>

      {/* Edit Form */}
      {isEditing && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">编辑需求</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as RequirementStatus)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="submitted">待处理</option>
                <option value="in_progress">处理中</option>
                <option value="completed">已完成</option>
                <option value="confirmed">已确认</option>
                <option value="rejected">已拒绝</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">分配给</label>
              <select
                value={editAssignedTo}
                onChange={(e) => setEditAssignedTo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">未分配</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.title})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">处理回复</label>
            <textarea
              value={editResponse}
              onChange={(e) => setEditResponse(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              placeholder="填写处理进度或回复内容"
            />
          </div>

          <div className="flex justify-between">
            {isAdminOrGM && (
              <button
                type="button"
                onClick={() => setShowRejectForm(true)}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                拒绝需求
              </button>
            )}
            <div className={`flex gap-3 ${!isAdminOrGM ? 'ml-auto' : ''}`}>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={loading}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Form */}
      {showRejectForm && (
        <div className="bg-white rounded-xl border border-red-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-red-600">拒绝需求</h2>
          <p className="text-sm text-gray-600">请填写拒绝原因，提出人将看到此信息</p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
            placeholder="请说明拒绝的原因..."
            autoFocus
          />
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setShowRejectForm(false);
                setRejectReason('');
              }}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleReject}
              disabled={loading}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              确认拒绝
            </button>
          </div>
        </div>
      )}

      {/* Submitter Confirmation (when completed) */}
      {isSubmitter && requirement.status === 'completed' && (
        <div className="bg-white rounded-xl border border-green-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">请确认功能</h2>
          <p className="text-sm text-gray-600">
            处理人已完成该需求，请确认是否满意。如有问题可反馈继续改进。
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => handleConfirm(true)}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
            >
              满意，确认完成
            </button>
            <button
              onClick={() => handleConfirm(false)}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors font-medium"
            >
              有问题，继续改进
            </button>
          </div>
        </div>
      )}

      {/* Status Timeline */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">状态记录</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 mt-2 rounded-full bg-gray-400" />
            <div>
              <div className="text-sm text-gray-900">需求已提交</div>
              <div className="text-xs text-gray-500">
                {new Date(requirement.created_at).toLocaleString('zh-CN')}
              </div>
            </div>
          </div>

          {requirement.assigned_name && (
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 mt-2 rounded-full bg-blue-400" />
              <div>
                <div className="text-sm text-gray-900">
                  已分配给 {requirement.assigned_name} 处理
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(requirement.updated_at).toLocaleString('zh-CN')}
                </div>
              </div>
            </div>
          )}

          {(requirement.status === 'in_progress' || requirement.status === 'completed' || requirement.status === 'confirmed') && (
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 mt-2 rounded-full bg-green-400" />
              <div>
                <div className="text-sm text-gray-900">
                  {requirement.status === 'completed' ? '已完成' : requirement.status === 'confirmed' ? '已确认' : '处理中'}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(requirement.updated_at).toLocaleString('zh-CN')}
                </div>
              </div>
            </div>
          )}

          {requirement.status === 'rejected' && (
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 mt-2 rounded-full bg-red-400" />
              <div>
                <div className="text-sm text-gray-900">已拒绝</div>
                <div className="text-xs text-gray-500">
                  {new Date(requirement.updated_at).toLocaleString('zh-CN')}
                </div>
              </div>
            </div>
          )}

          {requirement.confirmed_at && (
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 mt-2 rounded-full bg-purple-400" />
              <div>
                <div className="text-sm text-gray-900">提交人已确认满意</div>
                <div className="text-xs text-gray-500">
                  {new Date(requirement.confirmed_at).toLocaleString('zh-CN')}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}