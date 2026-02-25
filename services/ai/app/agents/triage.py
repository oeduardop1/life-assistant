"""Triage node — classifies user intent and routes to the appropriate domain agent.

Uses a fast, cheap LLM (e.g. gemini-flash-latest) with structured output to
classify the user's message into one of five domains: tracking, finance,
memory, wellbeing, or general.

The triage node only sets ``state["current_agent"]`` — it does NOT add
messages to state. On triage failure, falls back to "general".
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any, Literal, cast

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from collections.abc import Callable

    from langchain_core.language_models.chat_models import BaseChatModel
    from langchain_core.runnables import RunnableConfig

    from app.agents.state import AgentState

logger = logging.getLogger(__name__)


class TriageDecision(BaseModel):
    """Structured output for the triage classifier."""

    agent: Literal["tracking", "finance", "memory", "wellbeing", "general"]
    confidence: float = Field(ge=0.0, le=1.0)


TRIAGE_PROMPT = """\
Classifique a mensagem do usuario em uma das categorias:
- "tracking": métricas (peso, agua, sono, exercicio, humor, energia) ou habitos
- "finance": dinheiro, gastos, contas, despesas, investimentos, dividas, renda
- "memory": o que a IA sabe sobre o usuario, pedir para lembrar algo
- "wellbeing": sentimentos, emoções, ansiedade, estresse, desabafos, reflexões
- "general": cumprimentos, perguntas gerais, bate-papo

Exemplos:
- "Registra 2L de agua" → tracking
- "Quanto gastei este mes?" → finance
- "O que voce sabe sobre mim?" → memory
- "Estou me sentindo ansioso" → wellbeing
- "Bom dia!" → general
- "Fiz musculação hoje" → tracking
- "Preciso pagar a conta de luz" → finance
- "Lembra que eu gosto de café" → memory
- "Tô estressado com o trabalho" → wellbeing
- "Me conta uma curiosidade" → general
- "Registra meu peso" → tracking
- "Pesei 80kg hoje" → tracking
- "Dormi 7 horas" → tracking
- "Meu humor hoje tá 7" → tracking
- "Gastei 50 reais no almoço" → finance
"""


def make_triage_node(
    triage_llm: BaseChatModel,
) -> Callable[..., Any]:
    """Factory: creates a triage node with the LLM captured in closure.

    Parameters
    ----------
    triage_llm:
        A fast LLM configured with temperature=0 for deterministic
        classification (e.g. gemini-flash-latest via ``create_triage_llm``).

    Returns
    -------
    Async callable suitable as a LangGraph node.
    """
    router = triage_llm.with_structured_output(TriageDecision)

    async def triage_node(state: AgentState, config: RunnableConfig) -> dict[str, str]:
        """Classify the last user message and set ``current_agent``."""
        last_msg = state["messages"][-1]
        content = last_msg.content if hasattr(last_msg, "content") else str(last_msg)

        try:
            result = await router.ainvoke(
                [
                    SystemMessage(content=TRIAGE_PROMPT),
                    HumanMessage(content=content),
                ],
            )
            decision = cast("TriageDecision", result)
            logger.info(
                "Triage: '%s' → %s (confidence=%.2f)",
                content[:80],
                decision.agent,
                decision.confidence,
            )
            return {"current_agent": decision.agent}
        except Exception:
            logger.warning("Triage failed, falling back to general", exc_info=True)
            return {"current_agent": "general"}

    return triage_node
