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
 * Chat panel for natural language diagram editing.
 * Maintains conversation history, sends currentXml + conversationHistory + modelId to Lambda.
 * Updates the Draw.io editor in real-time via onArchitectureUpdate callback.
 */
export function DiagramChat({ currentXml, onArchitectureUpdate, className }: DiagramChatProps) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "I can see your current architecture. Tell me what to change:\n\n• \"Add a WAF in front of the ALB\"\n• \"Add CloudWatch monitoring\"\n• \"Replace RDS with Aurora Serverless\"\n• \"Add an S3 bucket for static assets\"\n• \"Remove the NAT Gateway\"",
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

  // Clear history on unmount (session-scoped)
  React.useEffect(() => {
    return () => {
      // Conversation history is component-scoped, cleared on unmount
    };
  }, []);

  /**
   * Build conversation history for the request payload.
   * Excludes the welcome message and maps to { role, content } format.
   */
  const buildConversationHistory = React.useCallback((): Array<{ role: string; content: string }> => {
    return messages
      .filter((m) => m.id !== "welcome")
      .map((m) => ({ role: m.role, content: m.content }));
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const userPrompt = input.trim();
    setInput("");
    setIsLoading(true);

    try {
      // Read model selection from localStorage
      const modelId = getSelectedModelId();

      // Build request payload
      const payload: Record<string, unknown> = {
        prompt: userPrompt,
        conversationHistory: buildConversationHistory(),
      };

      // Include currentXml (truncated if needed)
      if (currentXml) {
        payload.currentXml = truncateXml(currentXml);
      }

      // Include modelId if set
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
        const drawioXml = data.drawioXml;

        const aiMessage: ChatMessage = {
          id: `msg-${Date.now()}-ai`,
          role: "assistant",
          content: "Done! Architecture updated. The diagram is refreshing...",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);

        // Notify parent with the new XML
        if (onArchitectureUpdate && drawioXml) {
          onArchitectureUpdate(drawioXml);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        const aiMessage: ChatMessage = {
          id: `msg-${Date.now()}-ai`,
          role: "assistant",
          content: `I couldn't process that change. ${(errorData as { error?: string }).error || "Try being more specific."}`,
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
              Updating architecture...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-border">
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
            placeholder="Describe changes..."
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
  );
}
