'use client';

import { useState, useEffect } from 'react';
import {
  getSocialMediaPostsAction,
  getSocialMediaEmployeesAction,
  createSocialMediaPostAction,
  approveSocialMediaPostAction,
  deleteSocialMediaPostAction,
  type SocialMediaPost,
  type CreateSocialMediaPostInput,
} from '@/lib/social-media/actions';
import {
  REWARD_NORMAL,
  REWARD_REAL_PERSON,
} from '@/lib/social-media/constants';

export function SocialMediaClient() {
  const [posts, setPosts] = useState<SocialMediaPost[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [yearMonth, setYearMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<CreateSocialMediaPostInput>({
    employee_id: '',
    platform: '抖音',
    video_url: '',
    is_real_person: false,
    likes: 0,
    views: 0,
    month: yearMonth,
  });

  const loadEmployees = async () => {
    const res = await getSocialMediaEmployeesAction();
    if (res.success) setEmployees(res.data || []);
  };

  const loadPosts = async () => {
    setLoading(true);
    const res = await getSocialMediaPostsAction({ month: yearMonth });
    if (res.success) setPosts(res.data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    loadPosts();
  }, [yearMonth]);

  const handleOpenForm = () => {
    setError('');
    setFormData({
      employee_id: '',
      platform: '抖音',
      video_url: '',
      is_real_person: false,
      likes: 0,
      views: 0,
      month: yearMonth,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.employee_id) {
      setError('请选择员工');
      return;
    }

    const input: CreateSocialMediaPostInput = {
      ...formData,
      video_url: formData.video_url || undefined,
      likes: formData.likes || 0,
      views: formData.views || 0,
    };

    const result = await createSocialMediaPostAction(input);

    if (result.success) {
      setShowForm(false);
      loadPosts();
    } else {
      setError(result.error || '操作失败');
    }
  };

  const handleApprove = async (id: string) => {
    const result = await approveSocialMediaPostAction(id);
    if (result.success) loadPosts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此记录？')) return;
    const result = await deleteSocialMediaPostAction(id);
    if (result.success) loadPosts();
  };

  // Stats
  const totalPosts = posts.length;
  const normalPosts = posts.filter(p => !p.is_real_person).length;
  const realPersonPosts = posts.filter(p => p.is_real_person).length;
  const totalReward = posts.reduce((sum, p) => sum + (p.reward || 0), 0);
  const pendingCount = posts.filter(p => p.status === 'pending').length;

  const availableMonths = (() => {
    const months: string[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return months;
  })();

  const monthLabel = (ym: string) => {
    const [y, m] = ym.split('-');
    return `${y}年${parseInt(m)}月`;
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case '抖音':
        return '🎵';
      case '快手':
        return '🎬';
      case '小红书':
        return '📕';
      case '微信视频号':
        return '💬';
      default:
        return '📱';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Month Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <select
            value={yearMonth}
            onChange={(e) => setYearMonth(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
          <button
            onClick={handleOpenForm}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            记录视频发布
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100 hover:border-gray-200 hover:shadow-subtle transition-all duration-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide">发布总数</p>
          <p className="text-xl font-semibold text-gray-900 mt-1.5 tracking-tight">{totalPosts}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 hover:border-gray-200 hover:shadow-subtle transition-all duration-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide">普通视频</p>
          <p className="text-xl font-semibold text-blue-600 mt-1.5 tracking-tight">
            {normalPosts} <span className="text-sm font-normal text-gray-400">({REWARD_NORMAL}元/条)</span>
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 hover:border-gray-200 hover:shadow-subtle transition-all duration-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide">真人出镜</p>
          <p className="text-xl font-semibold text-green-600 mt-1.5 tracking-tight">
            {realPersonPosts} <span className="text-sm font-normal text-gray-400">({REWARD_REAL_PERSON}元/条)</span>
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 hover:border-gray-200 hover:shadow-subtle transition-all duration-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide">待审核</p>
          <p className="text-xl font-semibold text-orange-600 mt-1.5 tracking-tight">{pendingCount}</p>
        </div>
        <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100">
          <p className="text-xs text-indigo-600 uppercase tracking-wide">奖励合计</p>
          <p className="text-xl font-semibold text-indigo-700 mt-1.5 tracking-tight">
            {totalReward.toLocaleString('zh-CN', { minimumFractionDigits: 2 })} 元
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">员工</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">平台</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">类型</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">点赞</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">浏览</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">奖励</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">发布时间</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {posts.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                  暂无记录
                </td>
              </tr>
            ) : (
              posts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">
                      {post.employee?.name || '-'}
                    </div>
                    <div className="text-xs text-gray-500">{post.employee?.title}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="text-lg">{getPlatformIcon(post.platform)}</span>
                      <span className="text-sm text-gray-900">{post.platform}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        post.is_real_person
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {post.is_real_person ? '真人出镜' : '普通视频'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-900">
                    {post.likes > 0 ? post.likes.toLocaleString() : '-'}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-900">
                    {post.views > 0 ? post.views.toLocaleString() : '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-semibold text-indigo-600">
                      {(post.reward || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })} 元
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        post.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : post.status === 'paid'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {post.status === 'pending' ? '待审核' : post.status === 'approved' ? '已通过' : '已发放'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(post.created_at).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {post.status === 'pending' && (
                      <button
                        onClick={() => handleApprove(post.id)}
                        className="text-green-600 hover:text-green-800 text-sm mr-2"
                      >
                        审核
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">记录视频发布</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  员工 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">请选择员工</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.title})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  平台 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="抖音">抖音</option>
                  <option value="快手">快手</option>
                  <option value="小红书">小红书</option>
                  <option value="微信视频号">微信视频号</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">视频链接</label>
                <input
                  type="url"
                  value={formData.video_url || ''}
                  onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                  placeholder="可选"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_real_person}
                    onChange={(e) => setFormData({ ...formData, is_real_person: e.target.checked })}
                    className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    真人出镜
                    <span className="text-gray-400 ml-1">
                      ({formData.is_real_person ? REWARD_REAL_PERSON : REWARD_NORMAL}元)
                    </span>
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">点赞数</label>
                  <input
                    type="number"
                    value={formData.likes || ''}
                    onChange={(e) => setFormData({ ...formData, likes: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">浏览量</label>
                  <input
                    type="number"
                    value={formData.views || ''}
                    onChange={(e) => setFormData({ ...formData, views: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">应得奖励</span>
                  <span className="text-xl font-bold text-indigo-600">
                    {formData.is_real_person ? REWARD_REAL_PERSON : REWARD_NORMAL} 元
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  记录
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}