import Link from 'next/link';
import { getCustomersAction } from '@/lib/customers/actions';
import { getAuthCookie } from '@/lib/auth/cookie';
import { STAGE_LABELS, STAGE_ORDER, type CustomerStage } from '@/types/customer';

export default async function CustomersPage() {
  const auth = await getAuthCookie();
  if (!auth) {
    return <div>未登录</div>;
  }

  const result = await getCustomersAction();
  const customers = result.data || [];

  // Get current stage index for progress indicator
  const getStageIndex = (stage: CustomerStage) => STAGE_ORDER.indexOf(stage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">客户列表</h1>
          <p className="text-gray-500 mt-1">共 {customers.length} 位客户</p>
        </div>
        <div className="flex items-center gap-3">
          {auth.role === 'admin' || auth.role === 'gm' ? (
            <Link
              href="/customers/import"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              导入
            </Link>
          ) : null}
          <Link
            href="/customers/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium active:scale-[0.98]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            新建客户
          </Link>
        </div>
      </div>

      {/* Customer List */}
      {customers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">暂无客户</h3>
          <p className="mt-2 text-gray-500">点击上方按钮添加第一个客户</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-all duration-200 hover:shadow-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    客户信息
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    业务归属
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    当前阶段
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    进度
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    创建时间
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {customers.map((customer) => {
                  const stageIndex = getStageIndex(customer.current_stage);

                  return (
                    <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center">
                            <span className="text-primary font-medium">
                              {customer.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{customer.name}</div>
                            <div className="text-sm text-gray-500">
                              {customer.phone || '无电话'}
                              {customer.area && ` · ${customer.area}`}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {customer.brand && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-600 mr-1">
                                  {customer.brand}
                                </span>
                              )}
                              {customer.capacity && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                                  {customer.capacity}
                                </span>
                              )}
                              {customer.customer_type === 'dealer' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-100 text-amber-700 ml-1">
                                  二级商
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm">
                          {customer.salesperson ? (
                            <div className="text-gray-900">{customer.salesperson.name}</div>
                          ) : (
                            <span className="text-gray-400">未分配</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            customer.current_stage === 'close'
                              ? 'bg-green-100 text-green-800'
                              : customer.current_stage === 'grid'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {STAGE_LABELS[customer.current_stage]}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="w-32">
                          <div className="flex items-center gap-1">
                            {STAGE_ORDER.map((stage, idx) => (
                              <div
                                key={stage}
                                className={`h-2 flex-1 rounded-full ${
                                  idx <= stageIndex
                                    ? stage === 'close'
                                      ? 'bg-green-500'
                                      : 'bg-primary'
                                    : 'bg-gray-200'
                                }`}
                                title={STAGE_LABELS[stage]}
                              />
                            ))}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {stageIndex + 1}/{STAGE_ORDER.length}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {new Date(customer.created_at).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/customers/${customer.id}`}
                          className="inline-flex items-center px-3 py-1.5 text-sm text-primary hover:text-primary-hover hover:bg-gray-100 rounded-md transition-colors duration-150"
                        >
                          查看详情
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
