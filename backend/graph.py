from langgraph.graph import StateGraph, START, END
from backend.state import GraphState
from backend.nodes import (
    input_node,
    sentiment_analysis_node,
    positive_agent_node,
    neutral_agent_node,
    negative_agent_node,
    response_formatter_node,
    output_node
)

# Define conditional routing edge
def route_sentiment(state: GraphState) -> str:
    """
    Looks at the classified sentiment in the graph state and routes 
    execution to the appropriate agent node.
    """
    sentiment = state.get("sentiment", "neutral")
    if sentiment == "positive":
        return "positive_agent"
    elif sentiment == "negative":
        return "negative_agent"
    else:
        return "neutral_agent"

# Initialize StateGraph with GraphState schema
workflow = StateGraph(GraphState)

# Add all process nodes to the graph
workflow.add_node("input_node", input_node)
workflow.add_node("sentiment_analysis_node", sentiment_analysis_node)
workflow.add_node("positive_agent_node", positive_agent_node)
workflow.add_node("neutral_agent_node", neutral_agent_node)
workflow.add_node("negative_agent_node", negative_agent_node)
workflow.add_node("response_formatter_node", response_formatter_node)
workflow.add_node("output_node", output_node)

# Set starting point
workflow.add_edge(START, "input_node")

# Input node routes directly to sentiment analyzer
workflow.add_edge("input_node", "sentiment_analysis_node")

# Route conditionally based on sentiment analysis output
workflow.add_conditional_edges(
    "sentiment_analysis_node",
    route_sentiment,
    {
        "positive_agent": "positive_agent_node",
        "neutral_agent": "neutral_agent_node",
        "negative_agent": "negative_agent_node"
    }
)

# All agent nodes output to the response formatter
workflow.add_edge("positive_agent_node", "response_formatter_node")
workflow.add_edge("neutral_agent_node", "response_formatter_node")
workflow.add_edge("negative_agent_node", "response_formatter_node")

# Formatter maps to final output, then END
workflow.add_edge("response_formatter_node", "output_node")
workflow.add_edge("output_node", END)

# Compile graph into a single runnable
app_graph = workflow.compile()
