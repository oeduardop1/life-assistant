# Supabase Auth Integration

> Authentication via Supabase GoTrue.

---

## Overview

| Aspecto | Valor |
|---------|-------|
| **Propósito** | Autenticação e gerenciamento de usuários |
| **Tipo** | Supabase Auth (GoTrue v2) |
| **Providers** | Email/senha, Google OAuth |

---

## Auth Methods

| Método | Status |
|--------|--------|
| Email/senha | ✅ Ativo |
| Google OAuth | ✅ Ativo |
| Apple OAuth | ⚪ Futuro |
| Magic Link | ⚪ Futuro |

---

## JWT Validation

JWTs são validados no backend usando `jose`:

```typescript
import * as jose from 'jose';

const JWKS = jose.createRemoteJWKSet(
  new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
);

const { payload } = await jose.jwtVerify(token, JWKS);
const userId = payload.sub;
```

---

## User Sync

Ao criar usuário no Supabase Auth:
1. Trigger cria registro na tabela `users`
2. `auth_id` vincula Supabase Auth → users
3. RLS usa `auth.uid()` para verificação

---

## Auth Service Implementation

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);
const supabaseAdmin = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey);

class AuthService {
  // Signup com email
  async signUpWithEmail(email: string, password: string, name: string): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${APP_URL}/auth/callback`,
      },
    });

    if (error) throw error;

    // Criar registro na tabela users
    if (data.user) {
      await createUser({
        id: data.user.id,
        email: data.user.email!,
        name,
        status: 'pending',
      });
    }

    return { user: data.user, session: data.session };
  }

  // Login com email
  async signInWithEmail(email: string, password: string): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return { user: data.user, session: data.session };
  }

  // Login com Google
  async signInWithGoogle(): Promise<{ url: string }> {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${APP_URL}/auth/callback`,
        scopes: 'email profile',
      },
    });

    if (error) throw error;
    return { url: data.url! };
  }

  // Logout
  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  }

  // Recuperar senha
  async resetPassword(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${APP_URL}/auth/reset-password`,
    });

    if (error) throw error;
  }

  // Atualizar senha
  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  }

  // Refresh session
  async refreshSession(): Promise<Session | null> {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw error;
    return data.session;
  }
}
```

---

## Auth Middleware (Backend)

```typescript
import { Request, Response, NextFunction } from 'express';

async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verificar token com Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Buscar usuário no banco
    const dbUser = await findUserById(user.id);

    if (!dbUser || dbUser.status !== 'active') {
      return res.status(403).json({ error: 'User not active' });
    }

    // Adicionar ao request
    req.user = dbUser;
    req.userId = dbUser.id;

    // Setar contexto para RLS
    await setDatabaseContext(dbUser.id);

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}
```

---

## Database Hooks (Triggers)

```sql
-- Trigger para criar usuário na tabela users após signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'pending'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger para atualizar email_verified_at
CREATE OR REPLACE FUNCTION handle_email_verified()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE public.users
    SET
      email_verified_at = NEW.email_confirmed_at,
      status = 'active'
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_verified
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_email_verified();
```

---

## RLS Integration

```sql
-- Política baseada em auth.uid()
CREATE POLICY "user_access" ON my_table
  FOR ALL USING (user_id = auth.uid());

-- Função para setar contexto (chamada pelo middleware)
CREATE OR REPLACE FUNCTION set_current_user_id(user_id UUID)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id::text, true);
END;
$$ LANGUAGE plpgsql;

-- Uso em policies quando auth.uid() não disponível
CREATE POLICY "user_access_via_config" ON my_table
  FOR ALL USING (
    user_id = COALESCE(
      auth.uid(),
      current_setting('app.current_user_id', true)::uuid
    )
  );
```

---

## Configuration

```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
SUPABASE_JWT_SECRET=xxx
```

---

## Frontend Usage

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Sign in
await supabase.auth.signInWithPassword({ email, password });

// Sign in with Google
await supabase.auth.signInWithOAuth({ provider: 'google' });

// Get session
const { data: { session } } = await supabase.auth.getSession();

// Listen to auth changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    // Handle sign in
  } else if (event === 'SIGNED_OUT') {
    // Handle sign out
  }
});
```

---

## Definition of Done

- [ ] Signup email/senha funciona
- [ ] Verificação de email enviada
- [ ] Login email/senha funciona
- [ ] Login Google OAuth funciona
- [ ] Logout funciona
- [ ] Recuperação de senha funciona
- [ ] Refresh token funciona
- [ ] Middleware protege rotas autenticadas
- [ ] Database hooks criam usuário automaticamente
- [ ] RLS policies aplicadas
- [ ] Auth state listener no frontend

---

*Última atualização: 26 Janeiro 2026*
