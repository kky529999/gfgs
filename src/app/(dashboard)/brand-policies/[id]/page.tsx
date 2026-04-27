import { EditBrandPolicyClient } from './EditBrandPolicyClient';

interface EditBrandPolicyPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBrandPolicyPage({ params }: EditBrandPolicyPageProps) {
  const { id } = await params;
  return <EditBrandPolicyClient policyId={id} />;
}
