'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createRequirementAction } from '@/lib/requirements/actions';
import type { Requirement, RequirementType, RequirementPriority } from '@/types';

interface RequirementsClientProps {
  requirements: Requirement[];
  currentUserId: string;
  currentUserRole: string;
}

export default function RequirementsClient({ requirements, currentUserId, currentUserRole }: RequirementsClientProps) {
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<RequirementType>('feedback');
  const [priority, setPriority] = useState<RequirementPriority>('medium');

  const isAdminOrGM = currentUserRole === 'admin' || currentUserRole === 'gm';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setMessage({ type: 'error', text: '请输入标题' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const result = await createRequirementAction({
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      priority,
    });

    if (result.success) {
      setMessage({ type: 'success', text: '需求已提交成功！' });
      setTitle('');
      setDescription('');
      setType('feedback');
      setPriority('medium');
      setShowForm(false);
      // Refresh page to show new requirement
      window.location.reload();
    } else {
      setMessage({ type: 'error', text: result.error || '提交失败' });
    }

    setSubmitting(false);
  };

  const getStatusBadge = (status: Requirement['status']) => {
    const config: Record<string, { label: string; className: string }> = {
      submitted: { label: '待处理', className: 'bg-gray-100 text-gray-700' },
      in_progress: { label: '处理中', className: 'bg-blue-100 text-blue-700' },
      completed: { label: '已完成', className: 'bg-green-100 text-green-700' },
      confirmed: { label: '已确认', className: 'bg-purple-100 text-purple-700' },
      rejected: { label: '已拒绝', className: 'bg-red-100 text-red-700' },
    };
    const { label, className } = config[status] || config.submitted;
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${className}`}>{label}</span>;
  };

  const getTypeBadge = (type: RequirementType) => {
    const config: Record<string, { label: string; className: string }> = {
      feedback: { label: '反馈', className: 'bg-amber-100 text-amber-700' },
      bug: { label: '问题', className: 'bg-red-100 text-red-700' },
      feature: { label: '需求', className: 'bg-blue-100 text-blue-700' },
    };
    const { label, className } = config[type] || config.feedback;
    return <span className={`px-2 py-1 rounded text-xs ${className}`}>{label}</span>;
  };

  const getPriorityBadge = (priority: RequirementPriority) => {
    const config: Record<string, { label: string; className: string }> = {
      low: { label: '低', className: 'text-gray-500' },
      medium: { label: '中', className: 'text-blue-500' },
      high: { label: '高', className: 'text-orange-500' },
      urgent: { label: '紧急', className: 'text-red-500 font-bold' },
    };
    const { label, className } = config[priority] || config.medium;
    return <span className={`text-xs ${className}`}>{label}</span>;
  };

  const submittedCount = requirements.filter(r => r.status === 'submitted').length;
  const inProgressCount = requirements.filter(r => r.status === 'in_progress').length;
  const completedCount = requirements.filter(r => r.status === 'completed').length;
  const confirmedCount = requirements.filter(r => r.status === 'confirmed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">需求反馈</h1>
          <p className="text-sm text-gray-500 mt-1">提出问题和建议，共同改进系统</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          提交需求
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-2xl font-bold text-gray-900">{requirements.length}</div>
          <div className="text-sm text-gray-500">总计</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-2xl font-bold text-gray-700">{submittedCount}</div>
          <div className="text-sm text-gray-500">待处理</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-2xl font-bold text-blue-600">{inProgressCount}</div>
          <div className="text-sm text-gray-500">处理中</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="text-2xl font-bold text-green-600">{completedCount + confirmedCount}</div>
          <div className="text-sm text-gray-500">已完成</div>
        </div>
      </div>

      {/* Submit Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">提交新需求</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {message && (
              <div className={`p-3 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {message.text}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">标题 *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="简明描述你的问题或建议"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                maxLength={200}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as RequirementType)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="feedback">反馈建议</option>
                  <option value="bug">系统问题</option>
                  <option value="feature">功能需求</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as RequirementPriority)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                  <option value="urgent">紧急</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">详细描述</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="详细描述你遇到的问题或期望的功能（选填）"
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {submitting ? '提交中...' : '提交需求'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Requirements List */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="divide-y divide-gray-200">
          {requirements.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              暂无需求反馈
              <p className="text-sm mt-1">点击上方按钮提交你的第一个需求</p>
            </div>
          ) : (
            requirements.map((req) => (
              <Link
                key={req.id}
                href={`/requirements/${req.id}`}
                className="block p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getTypeBadge(req.type)}
                      {getPriorityBadge(req.priority)}
                      <span className="font-medium text-gray-900">{req.title}</span>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2">{req.description || '无详细描述'}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>提交人：{req.submitter_name || '未知'}</span>
                      <span>{new Date(req.created_at).toLocaleDateString('zh-CN')}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 ml-4">
                    {getStatusBadge(req.status)}
                    {req.assigned_name && (
                      <span className="text-xs text-gray-400">处理人：{req.assigned_name}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
