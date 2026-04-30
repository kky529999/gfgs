import { redirect } from 'next/navigation';
import { getCurrentAuth } from '@/lib/auth/cookie';
import { getRequirementAction } from '@/lib/requirements/actions';
import RequirementDetailClient from './RequirementDetailClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RequirementDetailPage({ params }: PageProps) {
  const { id: requirementId } = await params;
  const auth = await getCurrentAuth();

  if (!auth) {
    redirect('/login');
  }

  const result = await getRequirementAction(requirementId);

  if (!result.success || !result.data) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">需求不存在</h2>
          <p className="text-gray-500 mb-4">{result.error || '无法找到该需求'}</p>
          <a
            href="/requirements"
            className="text-primary hover:text-primary-hover"
          >
            返回需求列表
          </a>
        </div>
      </div>
    );
  }

  // Check permission
  const { data: requirement } = result;
  const isAdminOrGM = auth.role === 'admin' || auth.role === 'gm';
  const isOwner = requirement.submitter_id === auth.user_id;
  const isAssigned = requirement.assigned_to === auth.user_id;

  if (!isAdminOrGM && !isOwner && !isAssigned) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">无权访问</h2>
          <p className="text-gray-500 mb-4">您没有权限查看此需求</p>
          <a
            href="/requirements"
            className="text-primary hover:text-primary-hover"
          >
            返回需求列表
          </a>
        </div>
      </div>
    );
  }

  return (
    <RequirementDetailClient
      requirement={requirement}
      currentUserId={auth.user_id}
      currentUserRole={auth.role}
    />
  );
}