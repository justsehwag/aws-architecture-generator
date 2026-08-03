"use client";

import * as React from "react";
import { Send, Bot, Sparkles } from "lucide-react";
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

/** Suggestion chips shown above the input */
const SUGGESTION_CHIPS = [
  { label: "Explain this architecture", mode: "chat" as const },
  { label: "Describe the data flow", mode: "chat" as const },
  { label: "Suggest improvements", mode: "chat" as const },
  { label: "List all services", mode: "chat" as const },
  { label: "/add CloudWatch monitoring", mode: "xml" as const },
  { label: "Get AWS Pricing Estimate", mode: "chat" as const },
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
 * Detects mode based on slash prefix.
 * /command → modify diagram (xml mode)
 * Normal text → conversation (chat mode)
 */
function detectMode(input: string): "chat" | "xml" {
  const trimmed = input.trim();
  if (trimmed.startsWith('/')) {
    return "xml";
  }
  return "chat";
}

// --- Typing Effect Component ---

function TypingMessage({ content }: { content: string }) {
  const [displayed, setDisplayed] = React.useState("");
  const [isDone, setIsDone] = React.useState(false);

  React.useEffect(() => {
    const words = content.split(" ");
    let current = 0;
    const interval = setInterval(() => {
      current++;
      setDisplayed(words.slice(0, current).join(" "));
      if (current >= words.length) {
        clearInterval(interval);
        setIsDone(true);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [content]);

  return (
    <span>
      {isDone ? <FormattedMessage content={content} /> : displayed}
      {!isDone && <span className="animate-pulse ml-0.5 text-primary">|</span>}
    </span>
  );
}

// --- Markdown-like Message Formatter ---

function FormattedMessage({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <>
      {lines.map((line, i) => {
        const trimmed = line.trim();

        // Bullet points
        if (trimmed.startsWith("•") || trimmed.startsWith("-")) {
          const text = trimmed.replace(/^[•\-]\s*/, "");
          return (
            <div key={i} className="flex gap-1.5 ml-2 my-0.5">
              <span className="text-primary/70">•</span>
              <span>{renderBold(text)}</span>
            </div>
          );
        }

        // Numbered lists
        if (/^\d+[.)]\s/.test(trimmed)) {
          const match = trimmed.match(/^(\d+[.)]\s*)(.*)/);
          if (match) {
            return (
              <div key={i} className="flex gap-1.5 ml-2 my-0.5">
                <span className="text-primary/70 font-medium">{match[1]}</span>
                <span>{renderBold(match[2])}</span>
              </div>
            );
          }
        }

        // Empty lines
        if (trimmed === "") {
          return <div key={i} className="h-2" />;
        }

        // Regular text
        return (
          <div key={i} className="my-0.5">
            {renderBold(line)}
          </div>
        );
      })}
    </>
  );
}

/** Render **bold** markers */
function renderBold(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">
        {part}
      </strong>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}

// --- Loading Dots Component ---

function LoadingDots() {
  return (
    <div className="flex items-center gap-1">
      <span className="animate-bounce text-primary" style={{ animationDelay: "0ms" }}>●</span>
      <span className="animate-bounce text-primary/70" style={{ animationDelay: "150ms" }}>●</span>
      <span className="animate-bounce text-primary/40" style={{ animationDelay: "300ms" }}>●</span>
    </div>
  );
}

// --- Main Component ---

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
        "I can help you understand and modify your architecture.\n\n" +
        "💬 **Chat:** Just type normally to ask questions\n" +
        "• \"Explain this architecture\"\n" +
        "• \"What are the costs?\"\n\n" +
        "✏️ **Modify:** Start with / to change the diagram\n" +
        "• \"/add a WAF in front of the ALB\"\n" +
        "• \"/replace RDS with Aurora Serverless\"\n" +
        "• \"/remove the NAT Gateway\"",
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

    let finalPrompt = messageText.trim();

    // Special handling for pricing estimate
    if (finalPrompt === "Get AWS Pricing Estimate") {
      finalPrompt = `Analyze the AWS services in my current architecture diagram and provide a professional cost estimate. Format your response as:

**Monthly Cost Estimate**

| Service | Config | Monthly Cost |
|---------|--------|-------------|
(list each service with realistic config and cost)

**Total: $X/month**

**Region:** (infer from diagram or default to us-east-1)

**Assumptions:**
- (list 3-4 key assumptions)

**💰 Refine this estimate:** https://calculator.aws
Add your specific services and workload parameters for an accurate official estimate.

Be concise. Use realistic production defaults. Round costs to nearest dollar.`;
    }

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
    const mode = detectMode(finalPrompt);

    // Strip leading / for xml mode commands before sending to Lambda
    if (mode === 'xml' && finalPrompt.startsWith('/')) {
      finalPrompt = finalPrompt.slice(1).trim();
    }

    try {
      const modelId = getSelectedModelId();

      const payload: Record<string, unknown> = {
        prompt: finalPrompt,
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
          const aiMessage: ChatMessage = {
            id: `msg-${Date.now()}-ai`,
            role: "assistant",
            content: data.response || "I couldn't generate a response.",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, aiMessage]);
        } else if (data.drawioXml) {
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

  // Determine the latest assistant message id for typing effect
  const latestAssistantId = React.useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return messages[i].id;
    }
    return null;
  }, [messages]);

  return (
    <div className={cn("flex flex-col h-full bg-background border-l border-border", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold leading-none">Architecture Assistant</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">AI-powered diagram helper</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex gap-2.5",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {msg.role === "assistant" && (
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted/80 text-foreground rounded-bl-md"
              )}
            >
              {msg.role === "assistant" ? (
                msg.id === latestAssistantId && msg.id !== "welcome" ? (
                  <TypingMessage content={msg.content} />
                ) : (
                  <FormattedMessage content={msg.content} />
                )
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-2.5 items-start">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="bg-muted/80 rounded-2xl rounded-bl-md px-4 py-3">
              <LoadingDots />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips + Input */}
      <div className="border-t border-border">
        {/* Suggestion Chips */}
        <div className="px-4 pt-3 pb-2">
          <div className="grid grid-cols-2 gap-1.5">
            {SUGGESTION_CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => handleChipClick(chip.label)}
                disabled={isLoading}
                className="border border-border hover:border-primary/40 hover:bg-primary/5 text-xs px-3 py-2 rounded-lg text-foreground/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left truncate"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-3 pt-1">
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
              placeholder="Ask a question or type /command to modify..."
              className="flex-1 resize-none rounded-xl border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              rows={2}
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              className="self-end h-9 w-9 rounded-xl"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
