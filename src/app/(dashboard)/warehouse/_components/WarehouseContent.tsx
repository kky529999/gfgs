'use client';

import { useState } from 'react';
import { WarehouseClient } from './_components/WarehouseClient';
import { NewMaterialForm } from './_components/NewMaterialForm';
import type { WarehouseMaterial } from '@/types';
import { revalidatePath } from 'next/navigation';

interface WarehouseContentProps {
  materials: WarehouseMaterial[];
}

export function WarehouseContent({ materials }: WarehouseContentProps) {
  const [showNewForm, setShowNewForm] = useState(false);

  const handleSuccess = () => {
    setShowNewForm(false);
    revalidatePath('/warehouse');
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
