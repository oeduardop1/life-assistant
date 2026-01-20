'use client';

import Link from 'next/link';
import { Activity, MessageCircle, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface TrackingEmptyStateProps {
  onOpenForm?: () => void;
}

/**
 * Empty state shown when user has no tracking data
 *
 * @see ADR-015 for Low Friction Tracking Philosophy
 */
export function TrackingEmptyState({ onOpenForm }: TrackingEmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Activity className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Comece a registrar suas metricas</CardTitle>
        <CardDescription className="max-w-md mx-auto">
          Acompanhe seu peso, agua, sono, exercicios, humor e energia.
          Voce pode registrar durante uma conversa ou usando os formularios.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row gap-4 justify-center pb-6">
        <Button asChild variant="default">
          <Link href="/chat">
            <MessageCircle className="mr-2 h-4 w-4" />
            Registrar via Chat
          </Link>
        </Button>
        <Button variant="outline" onClick={onOpenForm}>
          <PenLine className="mr-2 h-4 w-4" />
          Registrar Manualmente
        </Button>
      </CardContent>
    </Card>
  );
}
