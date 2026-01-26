# WhatsApp Business Integration

> Canal de chat via WhatsApp Business Cloud API (futuro).

---

## Overview

| Aspecto | Valor |
|---------|-------|
| **Status** | ⚪ Futuro |
| **Provider** | WhatsApp Business Cloud API |
| **Prioridade** | Baixa |
| **Autenticação** | Webhook (Cloud API) — **TBD** |
| **Canal** | Chat (texto/áudio/imagem/documento) |

---

## Expected Behavior

Comportamento similar ao Telegram:
- Texto livre → Conversa com IA
- Áudio → Transcrição + processamento
- Imagem → Análise pela IA (se suportado)
- Documento → Salvo no vault ou notas

---

## Planned Contract (TBD)

> **Nota:** Ainda não há implementação no código. Este contrato define **o que precisa ser especificado** antes de iniciar.

### Webhook

- **Endpoint:** TBD (seguir padrão de `telegram.md` quando implementado)
- **Verificação:** assinatura/token do provedor (TBD)
- **Idempotência:** dedupe por `message_id` (TBD)
- **Retries:** responder **200** após enfileirar; erros são logados (padrão Telegram)

### Payload mínimo (esperado)

- `message_id`
- `from`
- `timestamp`
- `type` (text, audio, image, document)
- `content` (texto ou URL de mídia)

### Rate Limits & Quotas

- Respeitar limites da Cloud API (TBD)
- Backoff exponencial em 429/5xx (TBD)

---

## Related Documents

- [telegram.md](telegram.md) — Fluxos, comandos e templates existentes
- [README.md](README.md) — Mapa e status das integrações

---

*Última atualização: 26 Janeiro 2026*
