"""LLM factory — instantiate the configured LLM provider."""

from langchain_core.language_models.chat_models import BaseChatModel

from app.config import Settings


def create_llm(settings: Settings, *, temperature: float = 0.7) -> BaseChatModel:
    """Create a LangChain chat model based on ``LLM_PROVIDER`` configuration.

    Supported providers:
    - ``gemini`` (default) → ``ChatGoogleGenerativeAI``
    - ``anthropic`` → ``ChatAnthropic``
    """
    provider = settings.LLM_PROVIDER.lower()
    model = settings.LLM_MODEL

    if provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI

        return ChatGoogleGenerativeAI(
            model=model,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=temperature,
        )

    if provider == "anthropic":
        from langchain_anthropic import ChatAnthropic

        return ChatAnthropic(
            model=model,
            anthropic_api_key=settings.ANTHROPIC_API_KEY,
            temperature=temperature,
        )

    msg = f"Unsupported LLM provider: {provider}. Use 'gemini' or 'anthropic'."
    raise ValueError(msg)


def create_triage_llm(settings: Settings) -> BaseChatModel:
    """Create a fast, deterministic LLM for the triage classifier.

    Uses ``TRIAGE_LLM_MODEL`` (default: gemini-flash-latest) with temperature=0
    for deterministic classification. Always uses the Gemini provider since
    triage requires speed and low cost over capability.
    """
    from langchain_google_genai import ChatGoogleGenerativeAI

    return ChatGoogleGenerativeAI(
        model=settings.TRIAGE_LLM_MODEL,
        google_api_key=settings.GEMINI_API_KEY,
        temperature=0,
    )
