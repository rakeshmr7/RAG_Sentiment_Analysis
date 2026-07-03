import os
import logging
from dotenv import load_dotenv

# Set up logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("sentiment_router")

# Load environment variables
load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
LANGCHAIN_API_KEY = os.getenv("LANGCHAIN_API_KEY")
LANGCHAIN_PROJECT = os.getenv("LANGCHAIN_PROJECT", "langgraph-sentiment-router")
LANGCHAIN_TRACING_V2 = os.getenv("LANGCHAIN_TRACING_V2", "false").lower() in ("true", "1", "yes")

# Validate OpenAI key presence
is_mock_mode = False
if not OPENAI_API_KEY or OPENAI_API_KEY.strip() == "" or OPENAI_API_KEY.startswith("your-"):
    logger.warning("OPENAI_API_KEY not set. Backend will run in SIMULATED MOCK MODE for LLM tasks.")
    is_mock_mode = True

if not LANGCHAIN_API_KEY or LANGCHAIN_API_KEY.strip() == "" or LANGCHAIN_API_KEY.startswith("your-"):
    logger.warning("LANGCHAIN_API_KEY not set. LangSmith tracing is disabled.")
    # Ensure tracing environment variables don't crash if empty
    if "LANGCHAIN_API_KEY" in os.environ:
        del os.environ["LANGCHAIN_API_KEY"]
    os.environ["LANGCHAIN_TRACING_V2"] = "false"
else:
    logger.info("LangSmith tracing is configured and enabled.")
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_PROJECT"] = LANGCHAIN_PROJECT
    os.environ["LANGCHAIN_API_KEY"] = LANGCHAIN_API_KEY
