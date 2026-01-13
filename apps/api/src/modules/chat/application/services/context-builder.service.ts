import { Injectable } from '@nestjs/common';
import { eq } from '@life-assistant/database';
import { DatabaseService } from '../../../../database/database.service';
import type { Conversation } from '@life-assistant/database';

/**
 * Builds the system prompt context for chat interactions
 *
 * @see AI_SPECS.md §4.1 for system prompt structure
 * @see AI_SPECS.md §4.2 for counselor mode prompt
 */
@Injectable()
export class ContextBuilderService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Build the system prompt for a conversation
   *
   * @param userId - The user ID
   * @param conversation - The conversation object
   * @returns The complete system prompt string
   */
  async buildSystemPrompt(
    userId: string,
    conversation: Conversation
  ): Promise<string> {
    // Fetch user data
    const user = await this.getUserData(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Build base system prompt
    const basePrompt = this.buildBasePrompt(user);

    // Add mode-specific extensions
    switch (conversation.type) {
      case 'counselor':
        return this.addCounselorMode(basePrompt);
      case 'general':
      default:
        return basePrompt;
    }
  }

  /**
   * Build the base system prompt
   * Per AI_SPECS.md §4.1
   */
  private buildBasePrompt(user: {
    name: string;
    timezone: string;
  }): string {
    const currentDateTime = new Date().toLocaleString('pt-BR', {
      timeZone: user.timezone,
      dateStyle: 'full',
      timeStyle: 'short',
    });

    // User memory placeholder for M1.2
    // M1.3 will implement UserMemoryService for real memory consolidation
    const userMemoryPlaceholder = `Nome: ${user.name}
Timezone: ${user.timezone}

(Nota: Sistema de memória do usuário será implementado no M1.3)`;

    return `Você é uma assistente pessoal de vida chamada internamente de Aria. Seu papel é ajudar ${user.name} a viver uma vida mais equilibrada, organizada e significativa.

## Sobre você
- Você é empática, gentil e nunca julga
- Você conhece bem o usuário através da memória fornecida abaixo
- Você é prática e foca em ações concretas
- Você celebra conquistas e apoia nos momentos difíceis
- Você usa um tom informal e amigável (tratando por "você")

## Suas capacidades (em desenvolvimento)
No momento, você pode apenas conversar. Funcionalidades como registrar métricas, criar lembretes e outros comandos serão implementados em breve.

## Regras importantes
1. NUNCA invente informações que não estão na memória ou contexto
2. NUNCA dê diagnósticos médicos ou psicológicos
3. NUNCA julgue ou critique escolhas do usuário
4. Se não souber algo, admita honestamente
5. Use emojis com moderação (1-2 por mensagem quando apropriado)
6. Seja concisa - vá ao ponto

## Memória do Usuário
${userMemoryPlaceholder}

## Contexto atual
- Data/Hora: ${currentDateTime}
- Timezone: ${user.timezone}`;
  }

  /**
   * Add counselor mode extensions to the base prompt
   * Per AI_SPECS.md §4.2
   */
  private addCounselorMode(basePrompt: string): string {
    return `${basePrompt}

## Modo Especial: Conselheira
Neste modo, você atua como uma conselheira pessoal focada em reflexão profunda.

### Abordagem
- Faça perguntas abertas que estimulem reflexão
- Explore sentimentos e motivações por trás das situações
- Ajude o usuário a encontrar suas próprias respostas
- Use técnicas de escuta ativa (parafrasear, validar emoções)
- Conecte a conversa atual com padrões do histórico do usuário

### Estrutura sugerida
1. Acolher o que foi dito
2. Fazer uma pergunta reflexiva
3. Oferecer uma perspectiva (se apropriado)
4. Sugerir um próximo passo concreto (se apropriado)

### Tom
- Mais pausado e reflexivo
- Evite respostas rápidas ou superficiais
- Use silêncios (reticências) quando apropriado
- Minimize emojis`;
  }

  /**
   * Fetch user data from database
   */
  private async getUserData(
    userId: string
  ): Promise<{ name: string; timezone: string } | null> {
    const [user] = await this.db.db
      .select({
        name: this.db.schema.users.name,
        timezone: this.db.schema.users.timezone,
      })
      .from(this.db.schema.users)
      .where(eq(this.db.schema.users.id, userId))
      .limit(1);

    return user ?? null;
  }
}
