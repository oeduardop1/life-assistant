import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function VerifyEmailPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Verifique seu email</CardTitle>
        <CardDescription className="text-center">
          Enviamos um link de confirmacao para seu email. Por favor, clique no link para ativar sua conta.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-center text-sm text-muted-foreground">
        <p>
          Nao recebeu o email? Verifique sua pasta de spam ou solicite um novo email.
        </p>
        <p>
          Em ambiente de desenvolvimento, os emails sao capturados no Inbucket.
          <br />
          <a
            href="http://localhost:54324"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Abrir Inbucket
          </a>
        </p>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <Link href="/login" className="w-full">
          <Button variant="outline" className="w-full">
            Voltar para login
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
