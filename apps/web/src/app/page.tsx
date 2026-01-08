import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme/theme-toggle';

export default function Home() {
  return (
    <div className="relative min-h-screen">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Seu assistente pessoal com IA</span>
          </div>

          <h1
            className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl"
            data-testid="landing-title"
          >
            Life Assistant AI
          </h1>

          <p className="mb-8 text-lg text-muted-foreground" data-testid="landing-description">
            Seu segundo cérebro, conselheiro e tracker de vida. Organize seus pensamentos,
            tome decisões melhores e acompanhe seu progresso.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg" data-testid="cta-dashboard">
              <Link href="/dashboard">
                Acessar Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-16 grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Segundo Cérebro</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Capture e organize suas ideias com sistema de notas e wikilinks
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Decisões</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Tome decisões melhores com análise estruturada e revisões
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Acompanhe métricas de saúde, finanças e outras áreas da vida
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
