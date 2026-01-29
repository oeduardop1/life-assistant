import { BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function JournalingPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-muted rounded-full">
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold">Journaling</h1>
              <p className="text-muted-foreground">
                Registre seus pensamentos, reflexões e momentos importantes do dia a dia.
              </p>
            </div>
            <p className="text-sm text-muted-foreground italic">
              Em breve
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
