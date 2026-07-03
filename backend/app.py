import sys
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
import uvicorn

# Add the parent directory of backend to sys.path so 'backend' is recognized as a package
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import configurations & LangGraph application
from backend.config import logger, is_mock_mode, OPENAI_API_KEY, LANGCHAIN_API_KEY
from backend.graph import app_graph

app = FastAPI(
    title="AI Sentiment Routing API",
    description="Routes user queries to specialized agents dynamically using LangGraph.",
    version="1.0.0"
)

# Enable CORS for frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact frontend domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Data Models ---

class ChatRequest(BaseModel):
    query: str
    history: List[Dict[str, Any]] = []

class ChatResponse(BaseModel):
    query: str
    sentiment: str
    chosen_agent: str
    formatted_response: str
    logs: List[str]
    history: List[Dict[str, Any]]

# --- API Endpoints ---

@app.get("/api/health")
def health_check():
    """Verify that backend server and LLM configuration is healthy."""
    return {
        "status": "healthy",
        "mock_mode": is_mock_mode,
        "openai_configured": bool(OPENAI_API_KEY),
        "langsmith_configured": bool(LANGCHAIN_API_KEY)
    }

@app.post("/api/chat", response_model=ChatResponse)
async def chat_interaction(request: ChatRequest):
    """Processes user message through the LangGraph sentiment routing agent."""
    if not request.query or request.query.strip() == "":
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    
    logger.info(f"Incoming chat request: {request.query}")
    
    try:
        # Construct initial state
        initial_state = {
            "query": request.query,
            "history": request.history,
            "logs": []
        }
        
        # Execute the LangGraph StateGraph
        # This will trace automatically to LangSmith if API keys are set
        final_state = app_graph.invoke(initial_state)
        
        # Structure the response payload
        return ChatResponse(
            query=final_state.get("query"),
            sentiment=final_state.get("sentiment", "neutral"),
            chosen_agent=final_state.get("chosen_agent", "neutral_agent"),
            formatted_response=final_state.get("formatted_response", ""),
            logs=final_state.get("logs", []),
            history=final_state.get("history", [])
        )
        
    except Exception as e:
        logger.error(f"Error executing LangGraph: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"An error occurred while processing the request: {str(e)}"
        )
    
@app.get("/")
async def root():
    return {
        "message": "AI Sentiment Routing API is running",
        "health": "/api/health",
        "docs": "/docs"
    }

# Main entry point for local execution
if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
