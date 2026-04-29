import { notFound } from 'next/navigation';
import { getMonthlyDeptRulesOneAction, updateDeptRulesAction, deleteDeptRulesAction } from '@/lib/monthly-policies/actions';
import { EditDeptRulesClient } from './EditDeptRulesClient';

interface EditDeptRulesPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditDeptRulesPage({ params }: EditDeptRulesPageProps) {
  const { id } = await params;
  const result = await getMonthlyDeptRulesOneAction(id);

  if (!result.success || !result.data) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <a
          href="/monthly-dept-rules"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </a>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">编辑月度部门规则</h1>
          <p className="text-gray-500 mt-1">修改部门月度奖励和考核规则配置</p>
        </div>
      </div>

      {/* Edit Form */}
      <EditDeptRulesClient rules={result.data} />
    </div>
  );
}