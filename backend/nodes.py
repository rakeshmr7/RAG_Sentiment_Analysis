import json
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from backend.config import OPENAI_API_KEY, is_mock_mode, logger
from backend.state import GraphState

# Initialize the ChatOpenAI model if not in mock mode
llm = None
if not is_mock_mode:
    try:
        llm = ChatOpenAI(
            model="gpt-4o-mini",
            api_key=OPENAI_API_KEY,
            temperature=0.3  # lower temperature for more consistent classification/replies
        )
    except Exception as e:
        logger.error(f"Failed to initialize ChatOpenAI: {e}. Switching to mock mode.")
        is_mock_mode = True

def mock_sentiment_analysis(query: str) -> str:
    """Fintech-specific heuristic sentiment analyzer using keyword matching."""
    q = query.lower()
    pos_words = ["love", "great", "excellent", "awesome", "upgrade", "gold", "premium", "profit", "thanks", "helpful", "delighted", "perfect", "good"]
    neg_words = ["fraud", "stolen", "unauthorized", "block", "error", "charged twice", "double charge", "lost", "worst", "terrible", "issue", "scam", "hacked", "stole", "unhappy", "angry", "complaint", "fail", "wrong"]
    
    pos_count = sum(1 for w in pos_words if w in q)
    neg_count = sum(1 for w in neg_words if w in q)
    
    if pos_count > neg_count:
        return "positive"
    elif neg_count > pos_count:
        return "negative"
    return "neutral"

def mock_agent_response(sentiment: str, query: str) -> str:
    """Fintech-specific simulated response generator for mock mode."""
    if sentiment == "positive":
        return (
            f"Thank you for choosing ApexBank! 🌟 We're thrilled to hear your positive feedback regarding: '{query}'. "
            f"As a valued customer, we want to help you maximize your assets. Did you know that our **Apex Gold Tier** "
            f"currently features a **4.85% APY** on High-Yield Savings, zero wire transfer fees, and 2% cashback on all travel? "
            f"If you'd like, we can assist you with upgrading your account instantly in the app!"
        )
    elif sentiment == "negative":
        return (
            f"We take account security and transaction disputes extremely seriously at ApexBank. 🛑 I understand this is urgent "
            f"and frustrating. Regarding the security concern/issue: '{query}', please follow these immediate instructions:\n\n"
            f"1. **Lock Card**: Go to Cards -> Manage -> Lock Card in your app to prevent further charges.\n"
            f"2. **Dispute Charge**: If this is about an unauthorized transaction, select the charge in your ledger and click 'Dispute'.\n"
            f"3. **Contact Fraud Team**: Our Risk Operations desk has been alerted and will reach out to you via SMS shortly.\n\n"
            f"Your funds are protected by our Zero-Liability Protection Guarantee."
        )
    else:
        return (
            f"Thank you for contacting ApexBank Customer Operations. In response to your inquiry regarding: '{query}':\n\n"
            f"- **ACH/Direct Deposit Routing Number**: `021000021`\n"
            f"- **Wire Transfer Routing Number**: `021000033`\n"
            f"- **Operational Hours**: Customer Service lines are open Monday-Friday, 8:00 AM to 8:00 PM EST.\n"
            f"- **Standard Wire Cutoff**: 4:30 PM EST.\n\n"
            f"Let us know if you require specific transaction history or official letters."
        )

# ==================== LangGraph Nodes ====================

def input_node(state: GraphState) -> GraphState:
    """Prepares the state and appends execution logs."""
    logger.info(f"Node execution: input_node | Query: {state.get('query')}")
    state["logs"] = state.get("logs", [])
    state["logs"].append("input_node")
    # Initialize/Reset key variables for this run
    state["sentiment"] = None
    state["chosen_agent"] = None
    state["agent_response"] = None
    state["formatted_response"] = None
    state["history"] = state.get("history", [])
    return state

def sentiment_analysis_node(state: GraphState) -> GraphState:
    """Classifies fintech query sentiment into positive, neutral, or negative."""
    logger.info("Node execution: sentiment_analysis_node")
    state["logs"].append("sentiment_analysis_node")
    query = state["query"]
    
    if is_mock_mode:
        sentiment = mock_sentiment_analysis(query)
        logger.info(f"[Mock Mode] Sentiment classified: {sentiment}")
    else:
        try:
            system_prompt = (
                "You are an expert sentiment analyst for ApexBank (a digital banking platform). "
                "Your task is to classify incoming customer messages into exactly one of three categories:\n"
                "- 'positive' (appreciation, interest in premium upgrades, general happiness)\n"
                "- 'neutral' (informational requests, routing numbers, transaction history inquiries, general operations)\n"
                "- 'negative' (reports of fraud, stolen cards, double-charges, error codes, complaints, frustration)\n\n"
                "Return ONLY the lowercased word: 'positive', 'neutral', or 'negative' and absolutely nothing else."
            )
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=f"Query to classify: '{query}'")
            ]
            response = llm.invoke(messages)
            sentiment = response.content.strip().lower()
            if sentiment not in ["positive", "neutral", "negative"]:
                sentiment = mock_sentiment_analysis(query)
        except Exception as e:
            logger.error(f"Error in sentiment analysis LLM call: {e}")
            sentiment = mock_sentiment_analysis(query)
            
    state["sentiment"] = sentiment
    return state

def positive_agent_node(state: GraphState) -> GraphState:
    """Customer Growth & Loyalty Agent - friendly, motivational, promoting upgrades."""
    logger.info("Node execution: positive_agent_node")
    state["logs"].append("positive_agent_node")
    state["chosen_agent"] = "Customer Growth & Loyalty Agent"
    query = state["query"]
    
    if is_mock_mode:
        state["agent_response"] = mock_agent_response("positive", query)
    else:
        try:
            system_prompt = (
                "You are the Customer Growth & Loyalty Agent at ApexBank. The customer is expressing positive feedback or interest "
                "in expanding their banking relationship. Match their enthusiasm with warmth and motivation. "
                "Acknowledge their compliment, and introduce them to the premium benefits of upgrading (such as Apex Gold 4.85% APY, "
                "2% travel cash-back, and zero international fees) where natural."
            )
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=query)
            ]
            response = llm.invoke(messages)
            state["agent_response"] = response.content.strip()
        except Exception as e:
            logger.error(f"Error in positive agent LLM call: {e}")
            state["agent_response"] = mock_agent_response("positive", query)
            
    return state

def neutral_agent_node(state: GraphState) -> GraphState:
    """Account Operations & Info Agent - informational, analytical, and highly precise."""
    logger.info("Node execution: neutral_agent_node")
    state["logs"].append("neutral_agent_node")
    state["chosen_agent"] = "Account Operations & Info Agent"
    query = state["query"]
    
    if is_mock_mode:
        state["agent_response"] = mock_agent_response("neutral", query)
    else:
        try:
            system_prompt = (
                "You are the Account Operations & Info Agent at ApexBank. The customer is asking a neutral, operational question "
                "about routing numbers, fees, opening accounts, transfer speed, or hours of operation. "
                "Provide highly precise, clear, and analytical information. Use structured details and present exact figures "
                "objectively. Keep it neat and direct."
            )
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=query)
            ]
            response = llm.invoke(messages)
            state["agent_response"] = response.content.strip()
        except Exception as e:
            logger.error(f"Error in neutral agent LLM call: {e}")
            state["agent_response"] = mock_agent_response("neutral", query)
            
    return state

def negative_agent_node(state: GraphState) -> GraphState:
    """Escalation, Risk & Security Agent - highly empathetic, urgent, supportive, and safety-focused."""
    logger.info("Node execution: negative_agent_node")
    state["logs"].append("negative_agent_node")
    state["chosen_agent"] = "Escalation, Risk & Security Agent"
    query = state["query"]
    
    if is_mock_mode:
        state["agent_response"] = mock_agent_response("negative", query)
    else:
        try:
            system_prompt = (
                "You are the Escalation, Risk & Security Agent at ApexBank. The customer is dealing with a high-stress issue "
                "such as potential fraud, a lost/stolen card, double-charging, or account lockout. "
                "Start with immediate empathy, validation, and a calm, reassuring tone. Provide step-by-step instructions on security measures "
                "(like locking cards, initiating disputes, or contacting risk operations) and reassure them of their account security and "
                "our Zero Liability guarantee."
            )
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=query)
            ]
            response = llm.invoke(messages)
            state["agent_response"] = response.content.strip()
        except Exception as e:
            logger.error(f"Error in negative agent LLM call: {e}")
            state["agent_response"] = mock_agent_response("negative", query)
            
    return state

def response_formatter_node(state: GraphState) -> GraphState:
    """Formats the generated agent response into an exceptionally clean client-ready format."""
    logger.info("Node execution: response_formatter_node")
    state["logs"].append("response_formatter_node")
    agent_response = state["agent_response"]
    
    if is_mock_mode:
        state["formatted_response"] = f"### ApexBank Support Response\n\n{agent_response}"
    else:
        try:
            system_prompt = (
                "You are a professional editor and formatter for ApexBank Customer Operations. "
                "Take the generated support response and format it using professional Markdown elements. "
                "Use bullet points, bold key steps, and add headers if needed to maximize readability for our banking customer. "
                "Ensure standard formatting rules (e.g. routing numbers, step lists) are clear. Do not alter the tone or meaning."
            )
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=agent_response)
            ]
            response = llm.invoke(messages)
            state["formatted_response"] = response.content.strip()
        except Exception as e:
            logger.error(f"Error in formatter LLM call: {e}")
            state["formatted_response"] = f"### ApexBank Response\n\n{agent_response}"
            
    return state

def output_node(state: GraphState) -> GraphState:
    """Finalizes the workflow state and appends to conversation history."""
    logger.info("Node execution: output_node")
    state["logs"].append("output_node")
    
    # Save the final interaction to chat history
    state["history"].append({
        "role": "user",
        "content": state["query"]
    })
    state["history"].append({
        "role": "assistant",
        "content": state["formatted_response"],
        "sentiment": state["sentiment"],
        "agent": state["chosen_agent"]
    })
    return state
