# Data Import (CSV / JSON)

> Fluxo técnico para importação de dados.
> Fonte: `docs/specs/domains/saas.md` §12.

---

## 1. Escopo

Importação de dados do usuário via:
- **CSV genérico** (disponível)
- **JSON export** (disponível)
- **Integrações futuras** (Notion, Todoist, Google Keep)

---

## 2. Fluxo

1. Upload do arquivo
2. Mapeamento de campos
3. Preview de dados
4. Confirmação do usuário
5. Importação em background (job)
6. Notificação de conclusão

---

## 3. Validação

Regras mínimas:
- Schema válido por módulo (Zod)
- Normalização de datas (UTC)
- Moeda e timezone pelo `users.preferences`
- Deduplicação por chaves naturais quando aplicável

---

## 4. Jobs & Idempotência

- Cada import gera **jobId determinístico**
- Reprocessamento não cria duplicatas

---

## 5. Audit Log

Toda importação deve gerar audit log:

```
action: data.import
resource: import
metadata: { source, fileName, counts }
```

---

*Última atualização: 26 Janeiro 2026*
