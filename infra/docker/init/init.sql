-- Life Assistant Database Initialization
-- Este script e executado automaticamente na primeira vez que o container sobe

-- Habilitar extensoes necessarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar schema de audit
CREATE SCHEMA IF NOT EXISTS audit;

-- Mensagem de confirmacao
DO $$
BEGIN
  RAISE NOTICE 'Life Assistant database initialized successfully!';
  RAISE NOTICE 'Extensions enabled: uuid-ossp';
  RAISE NOTICE 'Schemas created: audit';
END $$;
