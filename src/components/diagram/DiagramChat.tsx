"use client";

import * as React from "react";
import { Send, Bot, User, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// --- Types ---

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface DiagramChatProps {
  /** Current Draw.io XML of the diagram */
  currentXml?: string;
  /** Callback when AI generates updated architecture */
  onArchitectureUpdate?: (xml: string) => void;
  className?: string;
}

// --- Constants ---

const LAMBDA_URL =
  process.env.NEXT_PUBLIC_DRAWIO_GENERATOR_URL ||
  "https://x4wedmmebyam6gdotufkbhfrfm0hkmwx.lambda-url.ap-south-1.on.aws/";

const MAX_XML_LENGTH = 45_000;

/** Prefixes/keywords that indicate a conversational (chat) question rather than a diagram edit */
const CHAT_PREFIXES = [
  "why",
  "what",
  "how",
  "explain",
  "describe",
  "analyze",
  "analyse",
  "tell me about",
  "list",
  "suggest",
  "compare",
  "is there",
  "are there",
  "can you",
  "could you explain",
  "what is",
  "what are",
  "estimate",
];

/** Suggestion chips shown above the input */
const SUGGESTION_CHIPS = [
  { label: "Explain this architecture", mode: "chat" as const },
  { label: "Describe the data flow", mode: "chat" as const },
  { label: "Suggest improvements", mode: "chat" as const },
  { label: "List all services", mode: "chat" as const },
  { label: "Add CloudWatch monitoring", mode: "xml" as const },
  { label: "Estimate monthly cost", mode: "chat" as const },
];

// --- Helpers ---

function getSelectedModelId(): string | null {
  try {
    return localStorage.getItem("selectedModelId");
  } catch {
    return null;
  }
}

function truncateXml(xml: string): string {
  if (xml.length <= MAX_XML_LENGTH) return xml;
  return xml.slice(0, MAX_XML_LENGTH) + "\n<!-- XML truncated due to size -->";
}

/**
 * Detects whether the user's input is a conversational question (chat mode)
 * or a diagram modification request (xml mode).
 */
function detectMode(input: string): "chat" | "xml" {
  const lower = input.toLowerCase().trim();
  for (const prefix of CHAT_PREFIXES) {
    if (lower.startsWith(prefix)) {
      return "chat";
    }
  }
  // If it ends with a question mark, treat as chat
  if (lower.endsWith("?")) {
    return "chat";
  }
  return "xml";
}

/**
 * Chat panel for natural language diagram editing AND conversational Q&A.
 * Maintains conversation history, sends currentXml + conversationHistory + modelId to Lambda.
 * Supports two modes:
 * - "xml": generates diagram updates via onArchitectureUpdate callback
 * - "chat": displays conversational responses about the architecture
 */
export function DiagramChat({ currentXml, onArchitectureUpdate, className }: DiagramChatProps) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "I can help you understand and modify your architecture. Ask me questions or request changes:\n\n• \"Explain this architecture\"\n• \"Add a WAF in front of the ALB\"\n• \"Describe the data flow\"\n• \"Add CloudWatch monitoring\"\n• \"Suggest improvements\"",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /**
   * Build conversation history for the request payload.
   * Excludes the welcome message and maps to { role, content } format.
   */
  const buildConversationHistory = React.useCallback((): Array<{ role: string; content: string }> => {
    return messages
      .filter((m) => m.id !== "welcome")
      .map((m) => ({ role: m.role, content: m.content }));
  }, [messages]);

  const submitMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: messageText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Detect mode based on input content
    const mode = detectMode(messageText.trim());

    try {
      const modelId = getSelectedModelId();

      const payload: Record<string, unknown> = {
        prompt: messageText.trim(),
        conversationHistory: buildConversationHistory(),
        mode,
      };

      if (currentXml) {
        payload.currentXml = truncateXml(currentXml);
      }

      if (modelId) {
        payload.modelId = modelId;
      }

      const response = await fetch(LAMBDA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();

        if (data.mode === "chat") {
          // Chat mode: display the text response
          const aiMessage: ChatMessage = {
            id: `msg-${Date.now()}-ai`,
            role: "assistant",
            content: data.response || "I couldn't generate a response.",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, aiMessage]);
        } else if (data.drawioXml) {
          // XML mode: update the diagram
          const aiMessage: ChatMessage = {
            id: `msg-${Date.now()}-ai`,
            role: "assistant",
            content: "Done! Architecture updated. The diagram is refreshing...",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, aiMessage]);

          if (onArchitectureUpdate) {
            onArchitectureUpdate(data.drawioXml);
          }
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        const aiMessage: ChatMessage = {
          id: `msg-${Date.now()}-ai`,
          role: "assistant",
          content: `I couldn't process that. ${(errorData as { error?: string }).error || "Try being more specific."}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-ai`,
          role: "assistant",
          content: "Network error — try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitMessage(input);
  };

  const handleChipClick = (chipLabel: string) => {
    if (isLoading) return;
    submitMessage(chipLabel);
  };

  return (
    <div className={cn("flex flex-col h-full bg-background border-l border-border", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Architecture Assistant</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex gap-2",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {msg.role === "assistant" && (
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[85%] rounded-lg px-3 py-2 text-xs whitespace-pre-wrap",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              )}
            >
              {msg.content}
            </div>
            {msg.role === "user" && (
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <User className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-2 items-center">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
            </div>
            <div className="bg-muted rounded-lg px-3 py-2 text-xs text-muted-foreground">
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips + Input */}
      <div className="border-t border-border">
        {/* Suggestion Chips */}
        <div className="px-3 pt-3 pb-1 overflow-x-auto">
          <div className="flex gap-1.5 flex-nowrap">
            {SUGGESTION_CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => handleChipClick(chip.label)}
                disabled={isLoading}
                className="bg-muted hover:bg-muted/80 text-xs px-3 py-1.5 rounded-full whitespace-nowrap text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-3 pt-2">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Ask a question or describe changes..."
              className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              rows={2}
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              className="self-end h-8 w-8"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
