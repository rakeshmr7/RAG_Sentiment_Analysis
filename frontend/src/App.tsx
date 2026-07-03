import React, { useState, useEffect, useRef } from "react";
import { 
  Landmark, 
  Send, 
  Trash2, 
  Sun, 
  Moon, 
  Sparkles, 
  Activity, 
  TrendingUp,
  Database,
  ShieldAlert,
  Server
} from "lucide-react";
import { GraphVisualizer } from "./components/GraphVisualizer";

interface Message {
  role: "user" | "assistant";
  content: string;
  sentiment?: "positive" | "neutral" | "negative";
  agent?: string;
}

interface SystemHealth {
  status: string;
  mock_mode: boolean;
  openai_configured: boolean;
  langsmith_configured: boolean;
}

// Lightweight, custom Markdown parser to avoid complex dependencies
const SafeMarkdown: React.FC<{ content: string }> = ({ content }) => {
  const parseContent = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      // Heading 3
      if (line.startsWith("### ")) {
        return (
          <h3 key={idx} className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-3 mb-1 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1">
            {line.substring(4)}
          </h3>
        );
      }
      // Bullet points
      if (line.startsWith("- ")) {
        return (
          <li key={idx} className="ml-4 list-disc text-xs text-slate-700 dark:text-slate-350 my-1">
            {line.substring(2)}
          </li>
        );
      }
      if (line.startsWith("* ")) {
        return (
          <li key={idx} className="ml-4 list-disc text-xs text-slate-700 dark:text-slate-350 my-1">
            {line.substring(2)}
          </li>
        );
      }
      // Standard list items (e.g. 1. text)
      const numMatch = line.match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        return (
          <li key={idx} className="ml-4 list-decimal text-xs text-slate-700 dark:text-slate-350 my-1">
            <span className="font-semibold">{numMatch[1]}.</span> {numMatch[2]}
          </li>
        );
      }

      // Inline formatting (bold **text**, code `text`)
      let renderedLine: React.ReactNode = line;
      
      // Handle bold **text**
      if (line.includes("**")) {
        const parts = line.split("**");
        renderedLine = parts.map((part, pIdx) => 
          pIdx % 2 === 1 ? <strong key={pIdx} className="font-bold text-brand-600 dark:text-brand-400">{part}</strong> : part
        );
      }

      // If line is empty, render spacer
      if (line.trim() === "") {
        return <div key={idx} className="h-2" />;
      }

      return (
        <p key={idx} className="text-xs text-slate-755 dark:text-slate-300 leading-relaxed my-1">
          {renderedLine}
        </p>
      );
    });
  };

  return <div className="space-y-0.5">{parseContent(content)}</div>;
};

export default function App() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "### Welcome to ApexBank Support Hub\n\nI am our intelligent routing virtual assistant powered by **LangGraph** workflows. " +
        "I dynamically classify the sentiment of your request and route it to our specialized bank representatives.\n\n" +
        "**Here is how I route queries:**\n" +
        "- **Positive Sentiment** ➔ routed to **Customer Growth & Loyalty Agent** (Motivational, premium upgrades)\n" +
        "- **Neutral Sentiment** ➔ routed to **Account Operations Agent** (Precise wire transfers, routing codes)\n" +
        "- **Negative Sentiment** ➔ routed to **Risk & Security Agent** (Calm crisis support, security blocks)\n\n" +
        "Try typing a message or use one of the quick test queries below!",
    }
  ]);
  const [activeLogs, setActiveLogs] = useState<string[]>([]);
  const [currentSentiment, setCurrentSentiment] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Default suggested queries for quick testing
  const suggestions = [
    {
      label: "Ask Routing Numbers",
      text: "What are your routing numbers for standard ACH transfers and wires?",
      type: "neutral"
    },
    {
      label: "Gold Tier Inquiry",
      text: "I love your investment features! How do I upgrade to the premium Gold tier account?",
      type: "positive"
    },
    {
      label: "Report Fraud",
      text: "Help! I notice a double charge on my account and my card is stolen!",
      type: "negative"
    }
  ];

  // Fetch backend system health on mount and poll periodically if offline
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/health");
        if (res.ok) {
          const data = await res.json();
          setSystemHealth(data);
          setIsConnected(true);
          return true;
        } else {
          setIsConnected(false);
          return false;
        }
      } catch (err) {
        setIsConnected(false);
        return false;
      }
    };

    checkHealth();

    // Poll every 4 seconds to detect when the FastAPI server comes online
    const intervalId = setInterval(() => {
      checkHealth();
    }, 4000);

    return () => clearInterval(intervalId);
  }, []);

  // Sync dark mode style on document body
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = async (e?: React.FormEvent, textOverride?: string) => {
    if (e) e.preventDefault();
    const activeQuery = textOverride || query;
    if (!activeQuery.trim() || isLoading) return;

    // Clear input
    setQuery("");

    // Add user message to state
    const userMsg: Message = { role: "user", content: activeQuery };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setActiveLogs([]);
    setCurrentSentiment(null);

    // Predict sentiment locally for intermediate spinner visual
    const lowerQ = activeQuery.toLowerCase();
    const isNeg = ["stolen", "lost", "fraud", "scam", "issue", "block", "charge", "worst", "error"].some(w => lowerQ.includes(w));
    const isPos = ["love", "great", "upgrade", "gold", "thanks", "perfect", "good", "happy"].some(w => lowerQ.includes(w));
    setCurrentSentiment(isNeg ? "negative" : isPos ? "positive" : "neutral");

    try {
      // Reformat history payload for FastAPI GraphState
      const historyPayload = messages.map(m => ({
        role: m.role,
        content: m.content,
        ...(m.sentiment ? { sentiment: m.sentiment } : {}),
        ...(m.agent ? { agent: m.agent } : {})
      }));

      const response = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: activeQuery,
          history: historyPayload
        })
      });

      if (!response.ok) {
        throw new Error("Server responded with an error");
      }

      const data = await response.json();
      
      // Update execution logs and final response
      setActiveLogs(data.logs);
      setCurrentSentiment(data.sentiment);
      
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: data.formatted_response,
          sentiment: data.sentiment,
          agent: data.chosen_agent
        }
      ]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: "### System Connection Error\n\nFailed to communicate with the FastAPI server. Please check that your backend API server is running on `http://localhost:8000`."
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: "### Welcome to ApexBank Support Hub\n\nI am our intelligent routing virtual assistant powered by **LangGraph** workflows. " +
          "I dynamically classify the sentiment of your request and route it to our specialized bank representatives.\n\n" +
          "Try typing a message or use one of the quick test queries below!",
      }
    ]);
    setActiveLogs([]);
    setCurrentSentiment(null);
  };

  // Helper to render sentiment badge colors
  const getSentimentStyles = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return {
          bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900",
          text: "text-emerald-700 dark:text-emerald-400",
          label: "Positive Sentiment",
          icon: TrendingUp
        };
      case "negative":
        return {
          bg: "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900",
          text: "text-rose-700 dark:text-rose-400",
          label: "Negative / Urgent",
          icon: ShieldAlert
        };
      default:
        return {
          bg: "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900",
          text: "text-indigo-700 dark:text-indigo-400",
          label: "Neutral Sentiment",
          icon: Database
        };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 grid-bg text-slate-800 dark:text-slate-100 transition-colors duration-300 flex flex-col">
      
      {/* Top Header Panel */}
      <header className="border-b border-slate-200 dark:border-slate-850 glass-effect sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-brand-600 p-2.5 rounded-xl shadow-md shadow-brand-500/20 text-white shrink-0">
            <Landmark className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              ApexBank Support Hub
              <span className="text-[10px] font-semibold bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-900 px-2 py-0.5 rounded-full uppercase tracking-wider">
                LangGraph Demo
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Sentiment Analysis & Specialized Routing Agent Pipeline
            </p>
          </div>
        </div>

        {/* System Diagnostics Badges & Controls */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2.5 text-[11px] border-r border-slate-200 dark:border-slate-800 pr-4">
            
            {/* Backend connection status */}
            <div className="flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5 text-slate-400" />
              <span className="font-semibold text-slate-500">API:</span>
              {isConnected === null ? (
                <span className="text-yellow-600 dark:text-yellow-400 font-medium">Checking...</span>
              ) : isConnected ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Connected</span>
              ) : (
                <span className="text-rose-600 dark:text-rose-400 font-medium">Offline</span>
              )}
            </div>

            {/* Simulated/Live Mode status */}
            {systemHealth && (
              <>
                <span className="text-slate-300 dark:text-slate-700 font-bold">•</span>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-slate-500">LLM Mode:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-350">
                    {systemHealth.mock_mode ? "Simulated Mock" : "Live GPT-4o"}
                  </span>
                </div>
                <span className="text-slate-300 dark:text-slate-700 font-bold">•</span>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-slate-500">LangSmith:</span>
                  <span className={`font-medium ${systemHealth.langsmith_configured ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
                    {systemHealth.langsmith_configured ? "Active Trace" : "Inactive"}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
            title="Toggle theme mode"
          >
            {isDarkMode ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
          </button>
        </div>
      </header>

      {/* Main Layout Area */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        
        {/* Left Side: Chat Interface */}
        <section className="lg:col-span-7 xl:col-span-8 flex flex-col h-[calc(100vh-140px)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-sm overflow-hidden transition-all">
          
          {/* Header of Chat */}
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
            <div className="flex items-center gap-2">
              <Activity className="h-4.5 w-4.5 text-brand-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Customer Conversation Session
              </span>
            </div>
            <button
              onClick={clearChat}
              className="text-2xs font-semibold text-slate-500 hover:text-rose-500 flex items-center gap-1 px-2.5 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-850 transition cursor-pointer"
              title="Reset conversation"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear History
            </button>
          </div>

          {/* Messages Log */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg, index) => {
              const isUser = msg.role === "user";
              const sentimentStyles = msg.sentiment ? getSentimentStyles(msg.sentiment) : null;
              const SentimentIcon = sentimentStyles?.icon;

              return (
                <div
                  key={index}
                  className={`flex flex-col max-w-[85%] ${
                    isUser ? "ml-auto items-end animate-slide-up" : "mr-auto items-start animate-slide-up"
                  }`}
                >
                  {/* Sender title */}
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mb-1 px-1">
                    {isUser ? "You (Client)" : msg.agent || "ApexBank Navigator"}
                  </span>

                  {/* Message Bubble */}
                  <div
                    className={`rounded-2xl px-4 py-3.5 text-xs shadow-sm border ${
                      isUser
                        ? "bg-brand-600 text-white border-brand-700 rounded-tr-none"
                        : "bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 border-slate-100 dark:border-slate-850 rounded-tl-none"
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    ) : (
                      <SafeMarkdown content={msg.content} />
                    )}
                  </div>

                  {/* Sentiment and Agent Details Badges */}
                  {!isUser && sentimentStyles && SentimentIcon && (
                    <div className="flex items-center gap-2 mt-1.5 px-1">
                      <div className={`flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full border font-bold ${sentimentStyles.bg} ${sentimentStyles.text}`}>
                        <SentimentIcon className="h-2.5 w-2.5" />
                        {sentimentStyles.label}
                      </div>
                      <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500">
                        Handled by: <span className="text-slate-600 dark:text-slate-300 font-bold">{msg.agent}</span>
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Spinner indicator when loading */}
            {isLoading && (
              <div className="mr-auto max-w-[80%] flex flex-col items-start animate-pulse">
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mb-1 px-1">
                  Graph Router
                </span>
                <div className="bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-850 rounded-2xl rounded-tl-none px-4 py-3.5 text-xs flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span className="text-2xs font-medium text-slate-500 dark:text-slate-400">
                    Executing routing workflow...
                  </span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* suggestions bottom panel */}
          <div className="px-5 py-2.5 bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-850 flex flex-wrap gap-2 items-center">
            <span className="text-3xs uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 mr-1 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-brand-500" />
              Routing Tests:
            </span>
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSubmit(undefined, s.text)}
                disabled={isLoading}
                className="text-3xs font-semibold px-2.5 py-1.5 rounded-lg border bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-800 text-slate-600 dark:text-slate-400 transition cursor-pointer shrink-0 disabled:opacity-50"
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Input Panel */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-slate-200 dark:border-slate-850 flex items-center gap-3 bg-white dark:bg-slate-900">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isConnected === false ? "FastAPI Server Offline. Testing unavailable..." : "Explain your query (e.g. 'I want to upgrade my account' or 'unauthorized charge')..."}
              disabled={isLoading || isConnected === false}
              className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:focus:border-brand-400 transition placeholder-slate-400 dark:placeholder-slate-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !query.trim() || isConnected === false}
              className="bg-brand-600 hover:bg-brand-700 text-white p-3 rounded-xl shadow-md shadow-brand-500/10 hover:shadow-brand-500/20 transition cursor-pointer shrink-0 disabled:opacity-50 disabled:shadow-none"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

        </section>

        {/* Right Side: Graph Visualizer Panel */}
        <section className="lg:col-span-5 xl:col-span-4 flex flex-col h-[calc(100vh-140px)]">
          <GraphVisualizer
            logs={activeLogs}
            isLoading={isLoading}
            sentiment={currentSentiment}
          />
        </section>

      </main>

      {/* Footer System Diagnostics */}
      <footer className="border-t border-slate-200 dark:border-slate-850 px-6 py-3 flex flex-col sm:flex-row items-center justify-between text-3xs font-medium text-slate-400 dark:text-slate-500 glass-effect">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Client System: Running in React 18 & Vite + Tailwind CSS</span>
        </div>
        <div className="mt-1 sm:mt-0 flex items-center gap-3">
          <span>Target Workflow: 8 Nodes StateGraph</span>
          <span>•</span>
          <span>API URL: http://localhost:8000</span>
        </div>
      </footer>

    </div>
  );
}
