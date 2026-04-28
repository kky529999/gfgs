'use client';

import { useState, useEffect } from 'react';
import type { WarehouseMaterial, StockMovement, StockMovementType } from '@/types';
import {
  getWarehouseMaterialsAction,
  getStockMovementsAction,
  createStockMovementAction,
  type CreateStockMovementInput,
} from '@/lib/warehouse/actions';

interface WarehouseClientProps {
  initialMaterials: WarehouseMaterial[];
}

export function WarehouseClient({ initialMaterials }: WarehouseClientProps) {
  const [materials, setMaterials] = useState(initialMaterials);
  const [selectedMaterial, setSelectedMaterial] = useState<WarehouseMaterial | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [showInboundModal, setShowInboundModal] = useState(false);
  const [showOutboundModal, setShowOutboundModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [formData, setFormData] = useState<{
    quantity: number;
    record_date: string;
    customer_id?: string;
    note: string;
  }>({
    quantity: 0,
    record_date: new Date().toISOString().split('T')[0],
    note: '',
  });
  const [formError, setFormError] = useState('');

  // Fetch materials
  const refreshMaterials = async () => {
    const result = await getWarehouseMaterialsAction();
    if (result.success && result.data) {
      setMaterials(result.data);
    }
  };

  // Fetch movements for selected material
  const fetchMovements = async (materialId: string) => {
    const result = await getStockMovementsAction({ material_id: materialId });
    if (result.success && result.data) {
      setMovements(result.data);
    }
  };

  const handleSelectMaterial = (material: WarehouseMaterial) => {
    setSelectedMaterial(material);
    fetchMovements(material.id);
  };

  const handleBack = () => {
    setSelectedMaterial(null);
    setMovements([]);
  };

  const handleSubmitMovement = async (type: StockMovementType) => {
    if (!selectedMaterial) return;
    if (formData.quantity <= 0) {
      setFormError('数量必须大于0');
      return;
    }

    setLoading(true);
    setFormError('');

    const input: CreateStockMovementInput = {
      material_id: selectedMaterial.id,
      type,
      quantity: formData.quantity,
      record_date: formData.record_date,
      customer_id: formData.customer_id,
      note: formData.note || undefined,
    };

    const result = await createStockMovementAction(input);

    if (result.success) {
      await refreshMaterials();
      const updated = materials.find((m) => m.id === selectedMaterial.id);
      if (updated) {
        setSelectedMaterial({ ...updated, quantity: type === 'inbound' ? updated.quantity + formData.quantity : type === 'outbound' ? updated.quantity - formData.quantity : formData.quantity });
      }
      await fetchMovements(selectedMaterial.id);
      setShowInboundModal(false);
      setShowOutboundModal(false);
      setShowAdjustModal(false);
      setFormData({ quantity: 0, record_date: new Date().toISOString().split('T')[0], note: '' });
    } else {
      setFormError(result.error || '操作失败');
    }

    setLoading(false);
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('zh-CN');
  };

  const statusLabels: Record<string, { label: string; className: string }> = {
    in_stock: { label: '有库存', className: 'bg-green-100 text-green-800' },
    reserved: { label: '已预留', className: 'bg-amber-100 text-amber-800' },
    out: { label: '已出库', className: 'bg-gray-100 text-gray-800' },
  };

  // Material detail view
  if (selectedMaterial) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{selectedMaterial.brand}</h2>
            {selectedMaterial.model && (
              <p className="text-gray-500">型号：{selectedMaterial.model}</p>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">当前库存</div>
            <div className="text-2xl font-bold text-indigo-600">
              {selectedMaterial.quantity} {selectedMaterial.unit || '件'}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => setShowInboundModal(true)}
            className="flex-1 p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-center"
          >
            <svg className="w-8 h-8 mx-auto mb-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="text-green-700 font-medium">入库</span>
          </button>
          <button
            onClick={() => setShowOutboundModal(true)}
            className="flex-1 p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-center"
          >
            <svg className="w-8 h-8 mx-auto mb-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
            <span className="text-blue-700 font-medium">出库</span>
          </button>
          <button
            onClick={() => setShowAdjustModal(true)}
            className="flex-1 p-4 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors text-center"
          >
            <svg className="w-8 h-8 mx-auto mb-2 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-amber-700 font-medium">调整</span>
          </button>
        </div>

        {/* Inbound Modal */}
        {showInboundModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-bold mb-4">入库登记</h3>
              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {formError}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">入库数量</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">入库日期</label>
                  <input
                    type="date"
                    value={formData.record_date}
                    onChange={(e) => setFormData({ ...formData, record_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                  <input
                    type="text"
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder="可选"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => { setShowInboundModal(false); setFormError(''); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={() => handleSubmitMovement('inbound')}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? '处理中...' : '确认入库'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Outbound Modal */}
        {showOutboundModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-bold mb-4">出库登记</h3>
              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {formError}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">出库数量</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                    min="1"
                    max={selectedMaterial.quantity}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">最多可出库 {selectedMaterial.quantity} {selectedMaterial.unit || '件'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">出库日期</label>
                  <input
                    type="date"
                    value={formData.record_date}
                    onChange={(e) => setFormData({ ...formData, record_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                  <input
                    type="text"
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder="可选"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => { setShowOutboundModal(false); setFormError(''); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={() => handleSubmitMovement('outbound')}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? '处理中...' : '确认出库'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Adjust Modal */}
        {showAdjustModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-bold mb-4">库存调整</h3>
              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {formError}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">调整后数量</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">当前库存 {selectedMaterial.quantity} {selectedMaterial.unit || '件'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">调整日期</label>
                  <input
                    type="date"
                    value={formData.record_date}
                    onChange={(e) => setFormData({ ...formData, record_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">调整原因</label>
                  <input
                    type="text"
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder="必填，如：盘点调整"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => { setShowAdjustModal(false); setFormError(''); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={() => handleSubmitMovement('adjust')}
                  disabled={loading}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                >
                  {loading ? '处理中...' : '确认调整'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Movement History */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">出入库记录</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">日期</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">数量</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作人</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">备注</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">暂无出入库记录</td>
                  </tr>
                ) : (
                  movements.map((movement) => (
                    <tr key={movement.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{formatDate(movement.record_date)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          movement.type === 'inbound' ? 'bg-green-100 text-green-800' :
                          movement.type === 'outbound' ? 'bg-blue-100 text-blue-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {movement.type === 'inbound' ? '入库' : movement.type === 'outbound' ? '出库' : '调整'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {movement.type === 'inbound' ? '+' : movement.type === 'outbound' ? '-' : ''}{movement.quantity}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {movement.operator?.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{movement.note || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Material list view
  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">品牌</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">型号</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">当前库存</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">备注</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {materials.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">暂无库存数据</td>
              </tr>
            ) : (
              materials.map((material) => (
                <tr key={material.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4">
                    <div className="font-medium text-gray-900">{material.brand}</div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">{material.model || '-'}</td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-gray-900">
                      {material.quantity} {material.unit || '件'}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      statusLabels[material.status]?.className || 'bg-gray-100 text-gray-800'
                    }`}>
                      {statusLabels[material.status]?.label || material.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500 max-w-xs truncate">{material.note || '-'}</td>
                  <td className="px-4 py-4 text-right">
                    <button
                      onClick={() => handleSelectMaterial(material)}
                      className="inline-flex items-center px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition-colors"
                    >
                      入库/出库
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {materials.length > 0 && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
          共 {materials.length} 条库存记录
        </div>
      )}
    </div>
  );
}
