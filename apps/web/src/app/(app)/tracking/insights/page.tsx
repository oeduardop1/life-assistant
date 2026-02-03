'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, TrendingUp } from 'lucide-react';

/**
 * Insights page - Correlations and trends from tracking data
 *
 * @see docs/specs/domains/tracking.md §3.4 for Insights tab
 */
export default function InsightsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Insights do Mês
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Em breve: correlações entre hábitos e métricas.
          </p>

          {/* Preview mockup */}
          <div className="space-y-3 opacity-50">
            <div className="p-4 border rounded-lg bg-muted/30">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm">
                    &quot;Quando você dorme 7h+, seu humor tende a ser 1.5 pontos maior&quot;
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Confiança: Alta
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-lg bg-muted/30">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="text-sm">
                    &quot;Dias com treino têm energia média de 7.8 vs 5.2 sem treino&quot;
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Confiança: Média
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
