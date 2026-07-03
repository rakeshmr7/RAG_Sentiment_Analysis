import React, { useEffect, useState } from "react";
import { 
  Play, 
  BrainCircuit, 
  GitFork, 
  Heart, 
  Database, 
  ShieldAlert, 
  PenTool, 
  CheckCircle,
  Clock
} from "lucide-react";

interface GraphVisualizerProps {
  logs: string[];
  isLoading: boolean;
  sentiment: string | null;
}

interface GraphNode {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  agentType?: string;
}

export const GraphVisualizer: React.FC<GraphVisualizerProps> = ({ logs, isLoading, sentiment }) => {
  const [activeSimulatedNode, setActiveSimulatedNode] = useState<string | null>(null);

  // List of all nodes in our design
  const nodes: GraphNode[] = [
    { 
      id: "input_node", 
      label: "Input Node", 
      description: "Receive & sanitize customer query", 
      icon: Play,
      color: "blue" 
    },
    { 
      id: "sentiment_analysis_node", 
      label: "Sentiment Analyzer", 
      description: "Classify query tone using LLM", 
      icon: BrainCircuit,
      color: "purple" 
    },
    { 
      id: "positive_agent_node", 
      label: "Growth & Loyalty Agent", 
      description: "Appreciative tone & Gold Tier cross-sell", 
      icon: Heart,
      color: "emerald",
      agentType: "positive"
    },
    { 
      id: "neutral_agent_node", 
      label: "Account Operations Agent", 
      description: "Precise ACH/Wire wire details & fees", 
      icon: Database,
      color: "indigo",
      agentType: "neutral"
    },
    { 
      id: "negative_agent_node", 
      label: "Risk & Security Agent", 
      description: "Empathetic crisis management & lock instructions", 
      icon: ShieldAlert,
      color: "rose",
      agentType: "negative"
    },
    { 
      id: "response_formatter_node", 
      label: "Response Formatter", 
      description: "Structure output in markdown", 
      icon: PenTool,
      color: "teal" 
    },
    { 
      id: "output_node", 
      label: "Output Node", 
      description: "Finalize state & append history", 
      icon: CheckCircle,
      color: "sky" 
    }
  ];

  // Simulating path traversal during loading for a premium visual feedback
  useEffect(() => {
    if (!isLoading) {
      setActiveSimulatedNode(null);
      return;
    }

    const steps = [
      "input_node",
      "sentiment_analysis_node",
      // Choose target node if sentiment is already known, otherwise general
      sentiment === "positive" ? "positive_agent_node" :
      sentiment === "negative" ? "negative_agent_node" :
      sentiment === "neutral" ? "neutral_agent_node" : "neutral_agent_node",
      "response_formatter_node",
      "output_node"
    ];

    let currentStep = 0;
    setActiveSimulatedNode(steps[0]);

    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < steps.length) {
        setActiveSimulatedNode(steps[currentStep]);
      } else {
        currentStep = 0;
        setActiveSimulatedNode(steps[0]);
      }
    }, 450);

    return () => clearInterval(interval);
  }, [isLoading, sentiment]);

  // Helper to determine node execution status
  const getNodeStatus = (node: GraphNode) => {
    if (isLoading) {
      if (activeSimulatedNode === node.id) return "active";
      return "idle";
    }

    if (logs.length === 0) return "idle";

    if (logs.includes(node.id)) {
      return "completed";
    }

    // If we have executed the graph, and this node is an agent but not in logs, it was skipped
    if (node.agentType && !logs.includes(node.id)) {
      return "skipped";
    }

    return "idle";
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition-all duration-300">
      <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-brand-500 animate-pulse-slow" />
            LangGraph Execution Visualizer
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time node status & conditional routing tracker
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full text-2xs font-semibold text-slate-600 dark:text-slate-400">
          <Clock className="h-3 w-3" />
          {isLoading ? "Running..." : logs.length > 0 ? "Executed" : "Standby"}
        </div>
      </div>

      {/* Nodes list representing StateGraph */}
      <div className="flex flex-col gap-2.5 overflow-y-auto flex-1 pr-1.5">
        {nodes.map((node, index) => {
          const status = getNodeStatus(node);
          const IconComponent = node.icon;

          // Compute style classes based on status
          let borderClass = "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950";
          let iconBgClass = "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
          let badgeText = "Idle";
          let badgeClass = "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400";

          if (status === "active") {
            borderClass = "border-brand-500 dark:border-brand-400 ring-2 ring-brand-100 dark:ring-brand-950/50 bg-brand-50/20 dark:bg-brand-950/10 shadow-[0_0_15px_rgba(77,115,255,0.15)] scale-[1.02]";
            iconBgClass = "bg-brand-500 text-white animate-pulse";
            badgeText = "Active Node";
            badgeClass = "bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 animate-pulse";
          } else if (status === "completed") {
            borderClass = "border-emerald-200 dark:border-emerald-950 bg-emerald-50/10 dark:bg-emerald-950/5";
            iconBgClass = "bg-emerald-500 text-white";
            badgeText = "Completed";
            badgeClass = "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300";
          } else if (status === "skipped") {
            borderClass = "border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-950/20 opacity-40 border-dashed";
            iconBgClass = "bg-slate-100 text-slate-400 dark:bg-slate-850 dark:text-slate-600";
            badgeText = "Skipped Route";
            badgeClass = "bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-500";
          }

          return (
            <React.Fragment key={node.id}>
              {/* Connector line for the router branch split */}
              {index === 2 && (
                <div className="flex justify-center my-0.5">
                  <div className="flex items-center gap-1 text-slate-300 dark:text-slate-700">
                    <GitFork className="h-4 w-4 rotate-180 text-purple-400 animate-pulse" />
                    <span className="text-3xs uppercase font-bold tracking-wider text-purple-500 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 px-2 py-0.5 rounded border border-purple-100 dark:border-purple-900">
                      Conditional Router Node
                    </span>
                  </div>
                </div>
              )}

              {/* Standard Connector Line */}
              {index > 0 && index !== 2 && index !== 3 && index !== 4 && index !== 5 && (
                <div className="flex justify-center -my-1.5 h-3">
                  <div className={`w-0.5 h-full ${status === "completed" ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-800"}`} />
                </div>
              )}

              {/* The Node Card */}
              <div className={`flex items-start gap-3 border rounded-xl p-3 transition-all duration-300 ${borderClass}`}>
                <div className={`p-2 rounded-lg ${iconBgClass} shrink-0 transition-colors duration-300`}>
                  <IconComponent className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {node.label}
                    </h4>
                    <span className={`text-[9px] px-1.5 py-0.5 font-bold rounded-full select-none ${badgeClass}`}>
                      {badgeText}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {node.description}
                  </p>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between text-3xs font-medium text-slate-400 dark:text-slate-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Completed
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" /> Executing
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700" /> Standby
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 border border-dashed border-slate-300 dark:border-slate-600 rounded-sm" /> Skipped
        </span>
      </div>
    </div>
  );
};
