'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WarehouseClient } from './WarehouseClient';
import { NewMaterialForm } from './NewMaterialForm';
import type { WarehouseMaterial } from '@/types';

interface WarehouseContentProps {
  materials: WarehouseMaterial[];
}

export function WarehouseContent({ materials }: WarehouseContentProps) {
  const router = useRouter();
  const [showNewForm, setShowNewForm] = useState(false);

  const handleSuccess = () => {
    setShowNewForm(false);
    router.refresh();
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowNewForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          新增材料
        </button>
      </div>

      <WarehouseClient initialMaterials={materials} />

      {showNewForm && (
        <NewMaterialForm
          onSuccess={handleSuccess}
          onCancel={() => setShowNewForm(false)}
        />
      )}
    </>
  );
}
