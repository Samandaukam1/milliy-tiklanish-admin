'use client';

import IssueEditorForm from '@/components/editor/issue-editor-form';
import { useParams } from 'next/navigation';

export default function EditIssuePage() {
  const params = useParams();
  const id = params?.id as string;
  return <IssueEditorForm issueId={id} />;
}
