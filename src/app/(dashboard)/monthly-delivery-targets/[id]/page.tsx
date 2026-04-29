import { notFound } from 'next/navigation';
import { getMonthlyDeliveryTargetAction, updateDeliveryTargetAction } from '@/lib/monthly-policies/actions';
import { EditDeliveryTargetClient } from './EditDeliveryTargetClient';

interface EditDeliveryTargetPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditDeliveryTargetPage({ params }: EditDeliveryTargetPageProps) {
  const { id } = await params;
  const result = await getMonthlyDeliveryTargetAction(id);

  if (!result.success || !result.data) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <a
          href="/monthly-delivery-targets"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </a>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">编辑月度达量配置</h1>
          <p className="text-gray-500 mt-1">修改品牌月度送货量目标和奖励配置</p>
        </div>
      </div>

      {/* Edit Form */}
      <EditDeliveryTargetClient target={result.data} />
    </div>
  );
}
