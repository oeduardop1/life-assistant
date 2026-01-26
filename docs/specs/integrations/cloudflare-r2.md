# Cloudflare R2 Integration

> S3-compatible object storage for files and exports.

---

## Overview

| Aspecto | Valor |
|---------|-------|
| **Propósito** | Armazenamento de arquivos |
| **Tipo** | S3-compatible API |
| **Use Cases** | Exports, uploads de usuário, backups |

---

## Configuration

```typescript
import { S3Client } from '@aws-sdk/client-s3';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});
```

---

## Operations

### Upload

```typescript
import { PutObjectCommand } from '@aws-sdk/client-s3';

await r2Client.send(new PutObjectCommand({
  Bucket: process.env.R2_BUCKET_NAME,
  Key: `exports/${userId}/${filename}`,
  Body: fileBuffer,
  ContentType: 'application/json',
}));
```

### Signed URL (Download)

```typescript
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const url = await getSignedUrl(
  r2Client,
  new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: `exports/${userId}/${filename}`,
  }),
  { expiresIn: 3600 * 24 * 7 } // 7 dias
);
```

---

## Storage Service

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const storageConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/markdown',
  ],
};

class StorageService {
  private client: S3Client;

  constructor() {
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }

  // Upload arquivo
  async upload(
    key: string,
    data: Buffer,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<string> {
    // Validar tamanho
    if (data.length > storageConfig.maxFileSize) {
      throw new Error(`File too large. Max: ${storageConfig.maxFileSize} bytes`);
    }

    // Validar tipo
    if (!storageConfig.allowedMimeTypes.includes(contentType)) {
      throw new Error(`File type not allowed: ${contentType}`);
    }

    await this.client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: data,
      ContentType: contentType,
      Metadata: metadata,
    }));

    return this.getPublicUrl(key);
  }

  // Upload com presigned URL (para upload direto do cliente)
  async getUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 3600
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  // Download
  async download(key: string): Promise<Buffer> {
    const response = await this.client.send(new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    }));

    return Buffer.from(await response.Body!.transformToByteArray());
  }

  // URL assinada para download
  async getDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  // Deletar
  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    }));
  }

  // URL pública (se bucket público ou custom domain)
  getPublicUrl(key: string): string {
    if (process.env.R2_PUBLIC_URL) {
      return `${process.env.R2_PUBLIC_URL}/${key}`;
    }
    return `https://${process.env.R2_BUCKET_NAME}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;
  }
}

export const storageService = new StorageService();
```

---

## Key Structure

```
bucket/
├── users/{userId}/
│   ├── avatar.{ext}                    # Avatar do usuário
│   ├── exports/                        # Exports de dados
│   │   └── {timestamp}.zip
│   └── attachments/                    # Anexos de notas
│       └── {noteId}/{filename}
│
├── vault/{userId}/{itemId}/            # Arquivos do vault (criptografados)
│   └── {filename}.enc
│
├── chat/{userId}/                      # Arquivos de conversa
│   └── {conversationId}/
│       └── {messageId}.{ext}
│
└── backups/                            # Backups do sistema
    └── {date}/{type}.sql.gz
```

### Key Patterns

| Use Case | Key Pattern | Example |
|----------|-------------|---------|
| Avatar | `users/{userId}/avatar.{ext}` | `users/abc123/avatar.jpg` |
| Export | `users/{userId}/exports/{ts}.zip` | `users/abc123/exports/1706284800.zip` |
| Note attachment | `users/{userId}/attachments/{noteId}/{file}` | `users/abc123/attachments/def456/doc.pdf` |
| Vault file | `vault/{userId}/{itemId}/{file}.enc` | `vault/abc123/ghi789/secret.pdf.enc` |
| Chat image | `chat/{userId}/{convId}/{msgId}.jpg` | `chat/abc123/conv1/msg1.jpg` |

---

## Security

| Aspecto | Implementação |
|---------|---------------|
| Acesso | Apenas via signed URLs |
| Expiração | URLs expiram em 7 dias (configurável) |
| Isolamento | Paths incluem userId |
| Validação | Tamanho máximo 10MB |
| Tipos | Whitelist de MIME types |
| Vault | Arquivos criptografados antes do upload |

---

## Presigned URLs

### Upload Direto do Cliente

```typescript
// Backend: gera URL para upload
const uploadUrl = await storageService.getUploadUrl(
  `users/${userId}/attachments/${noteId}/${filename}`,
  contentType,
  3600 // 1 hora
);

// Frontend: faz upload direto para R2
await fetch(uploadUrl, {
  method: 'PUT',
  body: file,
  headers: {
    'Content-Type': contentType,
  },
});
```

### Download Temporário

```typescript
// Gera URL para download (válida por 7 dias)
const downloadUrl = await storageService.getDownloadUrl(
  `users/${userId}/exports/${exportId}.zip`,
  7 * 24 * 60 * 60 // 7 dias
);
```

---

## Cleanup Job

```typescript
// Job para limpar arquivos expirados
async function cleanupExpiredFiles(): Promise<void> {
  // Exports mais antigos que 30 dias
  const exports = await listFiles('users/*/exports/*');
  for (const file of exports) {
    if (isOlderThan(file.lastModified, 30)) {
      await storageService.delete(file.key);
    }
  }

  // Avatars de usuários deletados
  const deletedUsers = await getDeletedUserIds();
  for (const userId of deletedUsers) {
    await deleteFolder(`users/${userId}/`);
  }
}
```

---

## Environment Variables

```bash
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=life-assistant
R2_PUBLIC_URL=https://files.myapp.com  # Optional: custom domain
```

---

## Definition of Done

- [ ] Upload de arquivos funciona (server-side)
- [ ] Upload via presigned URL funciona (client-side)
- [ ] Download funciona
- [ ] Signed URLs funcionam com expiração correta
- [ ] Validação de tamanho funciona
- [ ] Validação de tipo funciona
- [ ] Deleção funciona
- [ ] Exports são salvos corretamente
- [ ] Cleanup job remove arquivos expirados
- [ ] Isolamento por userId funciona

---

*Última atualização: 26 Janeiro 2026*
