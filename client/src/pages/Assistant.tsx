import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  Bot,
  Box,
  Loader2,
  MessageSquare,
  Package,
  Send,
  Truck,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Streamdown } from "streamdown";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const suggestedQuestions = [
  {
    icon: Package,
    text: "Which items are at risk of stockout in the next 14 days?",
  },
  {
    icon: Truck,
    text: "Show sales orders where quantity greater than 3?",
  },
  {
    icon: Box,
    text: "What is the status of my high priority orders?",
  },
];

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`w-8 h-8 shrink-0 flex items-center justify-center ${
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={`max-w-[80%] p-4 ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        }`}
      >
        {isUser ? (
          <p className="text-sm">{message.content}</p>
        ) : (
          <div className="text-sm prose prose-sm max-w-none dark:prose-invert">
            <Streamdown>{message.content}</Streamdown>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Assistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const formatDataForDisplay = (data: any): string => {
    // Priority 1: If data.data is an array, format as markdown table
    if (data?.data && Array.isArray(data.data)) {
      return formatArrayAsTable(data.data);
    }
    // Priority 2: Use response field
    if (data?.response) {
      return data.response;
    }
    // Fallback: JSON stringify
    return JSON.stringify(data, null, 2);
  };

  const formatArrayAsTable = (arr: any[]): string => {
    if (arr.length === 0) return "No data available.";
    
    const firstItem = arr[0];
    if (typeof firstItem !== 'object' || firstItem === null) {
      return arr.join('\n');
    }

    // Get all unique keys from first few items (limit to 5)
    const keys = new Set<string>();
    for (let i = 0; i < Math.min(5, arr.length); i++) {
      Object.keys(arr[i]).forEach(key => keys.add(key));
    }
    const headers = Array.from(keys).slice(0, 20); // Limit columns

    // Build markdown table
    let table = `| ${headers.join(' | ')} |\n`;
    table += `| ${headers.map(() => '---').join(' | ')} |\n`;

    // Add rows (limit to 20 rows for readability)
    for (let i = 0; i < Math.min(100, arr.length); i++) {
      const row = headers.map(key => {
        const val = arr[i][key];
        if (val === null || val === undefined) return '';
        if (typeof val === 'number') return val.toString();
        if (typeof val === 'boolean') return val ? 'Yes' : 'No';
        return String(val).substring(0, 30) + (String(val).length > 100 ? '...' : '');
      });
      table += `| ${row.join(' | ')} |\n`;
    }

    if (arr.length > 100) {
      table += `\n*Showing first 20 of ${arr.length} rows*`;
    }
 
    return table;
  };

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const scrollViewportRef = useRef<HTMLDivElement>(null);



  // Scroll to bottom when new messages added (preserve if user scrolled up)
  const wasAtBottomRef = useRef(true);
  useEffect(() => {
    if (scrollViewportRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollViewportRef.current;
      wasAtBottomRef.current = scrollTop + clientHeight >= scrollHeight - 10;
    }
  });

  useEffect(() => {
    if (wasAtBottomRef.current && scrollViewportRef.current) {
      const scrollToBottomSmooth = () => {
        scrollViewportRef.current!.scrollTop = scrollViewportRef.current!.scrollHeight;
      };
      requestAnimationFrame(scrollToBottomSmooth);
    }
  }, [messages.length]);



  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");

    try {
      const response = await fetch('https://jde-visionary-ai-backend.onrender.com/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: userMessage }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch response');
      }

      const data = await response.json();
      console.log('API Response:', data);

      setMessages((prev) => [
        ...prev,
{ role: "assistant", content: formatDataForDisplay(data) },
      ]);
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I apologize, but I encountered an error processing your request. Please try again.",
        },
      ]);
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="accent-square-lg" />
            <h1 className="text-3xl font-bold tracking-tight">Digital Assistant</h1>
          </div>
          <p className="text-muted-foreground">
            Ask questions about your supply chain using natural language
          </p>
        </div>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="border-b py-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              JDE Visionary AI
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 flex flex-col">
            <ScrollArea className="flex-1 p-4 h-[60vh] min-h-[400px]" ref={scrollAreaRef}>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 min-h-[400px]">
                  <div className="w-16 h-16 bg-primary/10 flex items-center justify-center mb-6">
                    <Bot className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    Welcome to the Digital Assistant
                  </h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md mb-8">
                    I can help you understand your supply chain data, identify risks,
                    and provide actionable insights. Try asking me a question!
                  </p>
                  <div className="grid gap-3 w-full max-w-lg">
                    <p className="text-caption">Suggested Questions</p>
                    {suggestedQuestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => handleSuggestedQuestion(q.text)}
                        className="flex items-center gap-3 p-3 text-left bg-muted hover:bg-muted/80 transition-colors text-sm"
                      >
                        <q.icon className="h-4 w-4 text-primary shrink-0" />
                        <span>{q.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 pt-4">
                  {messages.map((message, i) => (
                    <MessageBubble key={i} message={message} />
                  ))}
                  {isLoading && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 shrink-0 flex items-center justify-center bg-muted">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="p-4 bg-muted">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex gap-3"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about your supply chain..."
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
