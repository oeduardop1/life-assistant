# ADR-007: NestJS com CommonJS como Sistema de Módulos

## Status

Accepted

## Contexto

Durante a implementação do M0.5 (NestJS API), o projeto foi inicialmente configurado com `"type": "module"` no package.json, o que causou erros de runtime (`exports is not defined in ES module scope`).

O NestJS usa SWC como compilador padrão para melhor performance. A questão é: qual sistema de módulos usar - ESM ou CommonJS?

## Decisão

Usar **CommonJS** como sistema de módulos para o NestJS.

## Justificativa

### Confirmação Oficial

A documentação oficial do NestJS para Prisma (via Context7) menciona explicitamente "NestJS's CommonJS setup" e requer que o Prisma gere código em formato CommonJS:

```groovy
generator client {
  provider        = "prisma-client"
  moduleFormat    = "cjs"
}
```

### Problemas com ESM

1. **Imports de diretório não funcionam em ESM**: Imports como `'../common/decorators'` (sem extensão) falham com `ERR_UNSUPPORTED_DIR_IMPORT`
2. **Extensões obrigatórias**: ESM requer `.js` em todos os imports, mesmo para arquivos TypeScript
3. **Incompatibilidade com SWC default**: SWC para NestJS emite CommonJS por padrão

### Vantagens do CommonJS

1. Melhor compatibilidade com o ecossistema NestJS
2. Imports de diretório funcionam (`./decorators` resolve para `./decorators/index.js`)
3. Menos configuração necessária
4. Suporte nativo do SWC

## Consequências

### Positivas

- Compatibilidade total com NestJS e seu ecossistema
- Configuração mais simples
- Sem necessidade de extensões `.js` nos imports
- SWC funciona sem configuração adicional de módulos

### Negativas

- Não aproveita benefícios de ESM (tree-shaking nativo, top-level await)
- Pode precisar de ajustes se dependências futuras forem ESM-only

## Configuração Implementada

```json
// apps/api/package.json - Sem "type": "module"
{
  "name": "@life-assistant/api"
}
```

```json
// apps/api/tsconfig.json
{
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "Node"
  }
}
```

```json
// apps/api/.swcrc
{
  "module": {
    "type": "commonjs"
  }
}
```

## Alternativas Consideradas

### ESM Puro

- **Por que não:** Requer extensões `.js` em todos os imports, imports de diretório não funcionam, maior complexidade de configuração

### Dual Package (ESM + CJS)

- **Por que não:** Complexidade desnecessária para uma aplicação backend que não é publicada como biblioteca

## Referências

- NestJS Prisma documentation: moduleFormat must be "cjs"
- NestJS SWC recipe: configuração padrão usa CommonJS
