# Web Push Notifications

> Push web/PWA para notificações no dashboard.
> Fonte: `docs/specs/domains/notifications.md` (canais).

---

## Overview

| Aspecto | Valor |
|---------|-------|
| **Propósito** | Notificações push no navegador |
| **Status** | 🟡 Planejado |

---

## Requisitos (planejado)

- Service Worker registrado pelo frontend
- VAPID keys configuradas
- Subscribe/Unsubscribe por usuário
- Respeitar quiet hours

---

## Environment Variables (planejado)

```
WEB_PUSH_PUBLIC_KEY=xxx
WEB_PUSH_PRIVATE_KEY=xxx
WEB_PUSH_SUBJECT=mailto:suporte@exemplo.com
```

---

*Última atualização: 26 Janeiro 2026*
