"use client";

import * as React from "react";
import { Send, Bot, User, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface DiagramChatProps {
  /** Current architecture spec JSON */
  architectureSpec: unknown;
  /** Callback when AI generates updated architecture */
  onArchitectureUpdate?: (spec: unknown, xml: string) => void;
  className?: string;
}

/**
 * Chat panel for natural language diagram editing.
 * Reads current diagram state and sends modifications to Bedrock.
 * Updates the Draw.io editor in real-time.
 */
export function DiagramChat({ architectureSpec, onArchitectureUpdate, className }: DiagramChatProps) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "I can see your current architecture. Tell me what to change:\n\n• \"Add a WAF in front of the ALB\"\n• \"Add CloudWatch monitoring\"\n• \"Replace RDS with Aurora Serverless\"\n• \"Add an S3 bucket for static assets\"\n• \"Remove the NAT Gateway\"",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Build context from current architecture
  const currentContext = React.useMemo(() => {
    if (!architectureSpec) return "No architecture loaded yet.";
    const spec = architectureSpec as { name?: string; services?: Array<{ label: string; type: string }>; connections?: Array<{ sourceId: string; targetId: string; label?: string }> };
    const services = spec.services || [];
    const connections = spec.connections || [];
    let ctx = `Current architecture: "${spec.name || 'Untitled'}"\n`;
    ctx += `Services (${services.length}): ${services.map(s => `${s.label} (${s.type})`).join(', ')}\n`;
    ctx += `Connections (${connections.length}): ${connections.map(c => `${c.sourceId} → ${c.targetId}${c.label ? ` [${c.label}]` : ''}`).join(', ')}`;
    return ctx;
  }, [architectureSpec]);

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
      // Send current architecture as context + user's modification request
      const fullPrompt = `You have an existing AWS architecture. The current services are:\n\n${currentContext}\n\nThe user wants to: ${userPrompt}\n\nGenerate the COMPLETE updated architecture as Draw.io XML. Include ALL existing services plus the requested changes. Keep all existing services unless explicitly asked to remove them.`;

      const functionUrl = process.env.NEXT_PUBLIC_DRAWIO_GENERATOR_URL || 'https://x4wedmmebyam6gdotufkbhfrfm0hkmwx.lambda-url.ap-south-1.on.aws/';
      const response = await fetch(functionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: fullPrompt }),
      });

      if (response.ok) {
        const data = await response.json();
        const drawioXml = data.drawioXml;

        const aiMessage: ChatMessage = {
          id: `msg-${Date.now()}-ai`,
          role: "assistant",
          content: `Done! Architecture updated. The diagram is refreshing...`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);

        // Notify parent with the new XML directly
        if (onArchitectureUpdate && drawioXml) {
          onArchitectureUpdate(null, drawioXml);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        const aiMessage: ChatMessage = {
          id: `msg-${Date.now()}-ai`,
          role: "assistant",
          content: `I couldn't process that change. ${(errorData as { error?: string }).error || 'Try being more specific.'}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
      }
    } catch {
      setMessages((prev) => [...prev, {
        id: `msg-${Date.now()}-ai`,
        role: "assistant",
        content: "Network error. Please try again.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Suggestions based on current architecture
  const suggestions = React.useMemo(() => {
    const spec = architectureSpec as { services?: Array<{ type: string }> } | null;
    const types = new Set(spec?.services?.map(s => s.type) || []);
    const suggs: string[] = [];
    if (!types.has('cloudwatch')) suggs.push("Add CloudWatch monitoring");
    if (!types.has('waf') && (types.has('alb') || types.has('api-gateway'))) suggs.push("Add WAF protection");
    if (!types.has('s3')) suggs.push("Add S3 for storage");
    if (!types.has('route53')) suggs.push("Add Route 53 DNS");
    if (!types.has('cloudfront') && types.has('s3')) suggs.push("Add CloudFront CDN");
    return suggs.slice(0, 3);
  }, [architectureSpec]);

  return (
    <div className={cn("flex flex-col h-full bg-background border-l border-border", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Architecture Assistant</h3>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && messages.length <= 1 && (
        <div className="px-3 py-2 border-b border-border space-y-1">
          <p className="text-xs text-muted-foreground">Suggestions:</p>
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setInput(s)}
              className="block w-full text-left text-xs px-2 py-1.5 rounded bg-muted/50 hover:bg-muted text-foreground transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role === "assistant" && (
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
            <div className={cn(
              "max-w-[85%] rounded-lg px-3 py-2 text-xs whitespace-pre-wrap",
              msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
            )}>
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
            <div className="bg-muted rounded-lg px-3 py-2 text-xs text-muted-foreground">Updating architecture...</div>
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
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
            placeholder="Describe changes..."
            className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            rows={2}
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={!input.trim() || isLoading} className="self-end h-8 w-8">
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </form>
    </div>
  );
}


/** Generate Draw.io XML from architecture spec (same logic as diagram page) */
function generateXmlFromSpec(spec: { services?: Array<{ id: string; label: string; type: string }>; connections?: Array<{ id: string; sourceId: string; targetId: string; label?: string }> }): string {
  const services = spec.services || [];
  const connections = spec.connections || [];
  const cols = Math.max(3, Math.ceil(Math.sqrt(services.length)));
  const categoryColors: Record<string, string> = {
    ec2: '#ED7100', lambda: '#ED7100', ecs: '#ED7100', eks: '#ED7100', fargate: '#ED7100',
    s3: '#3F8624', ebs: '#3F8624', efs: '#3F8624',
    rds: '#C925D1', aurora: '#C925D1', dynamodb: '#C925D1', elasticache: '#C925D1',
    vpc: '#8C4FFF', cloudfront: '#8C4FFF', 'route53': '#8C4FFF', alb: '#8C4FFF', nlb: '#8C4FFF', 'api-gateway': '#8C4FFF', 'nat-gateway': '#8C4FFF',
    iam: '#DD344C', cognito: '#DD344C', waf: '#DD344C', kms: '#DD344C',
    sqs: '#E7157B', sns: '#E7157B', eventbridge: '#E7157B', 'step-functions': '#E7157B',
    cloudwatch: '#E7157B', sagemaker: '#01A88D', bedrock: '#01A88D',
  };
  const iconMap: Record<string, string> = { 'api-gateway': 'api_gateway', 'nat-gateway': 'vpc_nat_gateway', 'route53': 'route_53', 'step-functions': 'step_functions' };

  let cells = '<mxCell id="0"/><mxCell id="1" parent="0"/>';
  services.forEach((svc, i) => {
    const col = i % cols; const row = Math.floor(i / cols);
    const x = 80 + col * 200; const y = 80 + row * 160;
    const fill = categoryColors[svc.type] || '#232F3E';
    const resIcon = iconMap[svc.type] || svc.type.replace(/-/g, '_');
    const label = svc.label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    cells += `<mxCell id="${svc.id}" value="${label}" style="outlineConnect=0;fontColor=#232F3E;gradientColor=none;fillColor=${fill};strokeColor=none;dashed=0;verticalLabelPosition=bottom;verticalAlign=top;align=center;html=1;fontSize=11;fontStyle=0;aspect=fixed;pointerEvents=1;shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.${resIcon}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="48" height="48" as="geometry"/></mxCell>`;
  });
  connections.forEach((conn) => {
    const label = (conn.label || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    cells += `<mxCell id="${conn.id}" value="${label}" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeColor=#FFFFFF;fontSize=10;fontColor=#FFFFFF;labelBackgroundColor=none;" edge="1" source="${conn.sourceId}" target="${conn.targetId}" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?><mxfile><diagram name="Architecture"><mxGraphModel><root>${cells}</root></mxGraphModel></diagram></mxfile>`;
}
