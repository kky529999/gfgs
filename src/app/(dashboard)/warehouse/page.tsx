import Link from 'next/link';
import { getWarehouseMaterialsAction } from '@/lib/warehouse/actions';
import { getAuthCookie } from '@/lib/auth/cookie';
import { WarehouseContent } from './_components/WarehouseContent';

export default async function WarehousePage() {
  const auth = await getAuthCookie();
  if (!auth) {
    return <div>未登录</div>;
  }

  // Only admin and gm can access
  if (auth.role !== 'admin' && auth.role !== 'gm') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">无权访问</h2>
          <p className="text-gray-500 mt-2">您没有权限访问此页面</p>
          <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-800 mt-4 inline-block">
            返回工作台
          </Link>
        </div>
      </div>
    );
  }

  const result = await getWarehouseMaterialsAction();
  const materials = result.data || [];

  // Stats
  const totalItems = materials.reduce((sum, m) => sum + m.quantity, 0);
  const inStock = materials.filter((m) => m.status === 'in_stock').length;
  const outOfStock = materials.filter((m) => m.status === 'out').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">仓储管理</h1>
          <p className="text-gray-500 mt-1">管理材料库存和出入库记录</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">库存材料种类</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{materials.length}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">总库存量</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{totalItems}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">有库存 / 已出库</div>
          <div className="text-2xl font-bold text-indigo-600 mt-1">
            {inStock} / {outOfStock}
          </div>
        </div>
      </div>

      {/* Add Button & List */}
      <WarehouseContent materials={materials} />
    </div>
  );
}
