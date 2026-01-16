'use client';

import { useRouter } from 'next/navigation';
import { useOnboarding } from '@/hooks/use-onboarding';
import { AreaSelector } from '@/components/onboarding';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';
import type { AreasStepData } from '@/lib/validations/onboarding';

/**
 * AreasPage - Step 2 of onboarding wizard (required)
 *
 * Allows user to select 3-8 life areas to focus on.
 * Selected areas get weight 1.0, unselected get 0.0.
 *
 * @see docs/specs/system.md §3.1 for validation requirements
 */
export default function AreasPage() {
  const router = useRouter();
  const { data, saveAreasStep, isSaving, error } = useOnboarding();

  const handleSubmit = async (formData: AreasStepData) => {
    try {
      const response = await saveAreasStep(formData);
      toast.success('Areas selecionadas com sucesso!');
      router.push(`/onboarding/${response.nextStep}`);
    } catch {
      toast.error(error ?? 'Erro ao salvar areas');
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Areas da Vida</CardTitle>
        <CardDescription>
          Selecione as areas que voce deseja acompanhar e melhorar.
          A IA vai personalizar suas sugestoes baseado nessas escolhas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AreaSelector
          defaultValues={data.areas}
          onSubmit={handleSubmit}
          isLoading={isSaving}
        />
      </CardContent>
    </Card>
  );
}
