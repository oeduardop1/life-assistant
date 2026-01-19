# ADR-006: Uso de jose para JWT Validation

## Status

Accepted

## Data

2026-01-07

## Contexto

A API NestJS precisa validar JWTs emitidos pelo Supabase Auth para autenticar usuários.
O token JWT contém o `sub` claim com o `user_id` do usuário autenticado.

As opções consideradas foram:

1. `jsonwebtoken` - biblioteca tradicional, amplamente usada no ecossistema Node.js
2. `jose` - biblioteca moderna que usa WebCrypto API nativa
3. `passport-jwt` - estratégia Passport para validação de JWT

## Decisão

Usar `jose` para validação de JWT no AuthGuard.

## Consequências

### Positivas

- **Mais leve**: ~50KB vs ~200KB do jsonwebtoken
- **Performance**: Usa WebCrypto API nativa do Node.js
- **ESM nativo**: Suporte completo a ES Modules sem workarounds
- **Tree-shaking**: Melhor eliminação de código não usado
- **TypeScript nativo**: Não requer @types separado
- **Moderno**: Recomendação atual para aplicações Node.js modernas
- **Seguro**: Implementação auditada e mantida ativamente

### Negativas

- **Menos popular**: jsonwebtoken tem mais exemplos/tutoriais disponíveis
- **API diferente**: Desenvolvedores familiarizados com jsonwebtoken precisam aprender nova API

## Alternativas Consideradas

### 1. jsonwebtoken

Biblioteca tradicional mais popular para JWT em Node.js.

**Por que não:**
- Mais pesado (~200KB)
- Baseado em APIs legadas (callbacks, Buffer)
- Requer `@types/jsonwebtoken` separado para TypeScript
- Não otimizado para ESM

### 2. passport-jwt

Estratégia Passport para validação de JWT integrada ao ecossistema Passport.

**Por que não:**
- Overhead desnecessário para nosso caso de uso
- Não usamos estratégias Passport locais (login/senha)
- Auth é delegada ao Supabase, apenas validamos o token
- Passport seria útil apenas se adicionássemos OAuth login direto na aplicação

## Implementação

```typescript
// apps/api/src/common/guards/auth.guard.ts
import { jwtVerify } from 'jose';

const secretKey = new TextEncoder().encode(config.supabaseJwtSecret);
const { payload } = await jwtVerify(token, secretKey, {
  algorithms: ['HS256'],
});
```

## Referências

- [jose npm package](https://github.com/panva/jose)
- [Supabase JWT docs](https://supabase.com/docs/guides/auth/jwts)
- [engineering.md §2.3](../specs/engineering.md)
