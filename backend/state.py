from typing import TypedDict, List, Dict, Optional

class GraphState(TypedDict):
    """
    Represents the state of our LangGraph workflow.
    """
    query: str
    sentiment: Optional[str]            # "positive", "neutral", "negative"
    chosen_agent: Optional[str]         # "positive_agent", "neutral_agent", "negative_agent"
    agent_response: Optional[str]       # Raw response from the active agent
    formatted_response: Optional[str]   # Final polished response
    history: List[Dict[str, str]]       # Conversation history
    logs: List[str]                     # Tracks executed nodes for frontend visualization
