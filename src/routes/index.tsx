import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Flame, ImageIcon, Loader2, MessageSquare, Send, Sparkles } from "lucide-react";
import { streamImage } from "@/lib/stream-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Mujeeb AI — Image Studio & Roast Chat" },
      {
        name: "description",
        content:
          "Generate images from text and chat with Mujeeb AI, complete with a roast mode aimed squarely at Abaan.",
      },
      { property: "og:title", content: "Mujeeb AI — Image Studio & Roast Chat" },
      {
        property: "og:description",
        content:
          "Generate images from text and chat with Mujeeb AI, complete with a roast mode aimed squarely at Abaan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-4xl px-4 py-10">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight">Mujeeb AI</h1>
          <p className="text-muted-foreground mt-2">
            Image generation and chat, powered by Lovable AI.
          </p>
        </header>

        <Tabs defaultValue="image">
          <TabsList className="mx-auto mb-6 grid w-full max-w-sm grid-cols-2">
            <TabsTrigger value="image">
              <ImageIcon className="mr-2 size-4" /> Images
            </TabsTrigger>
            <TabsTrigger value="chat">
              <MessageSquare className="mr-2 size-4" /> Chat
            </TabsTrigger>
          </TabsList>
          <TabsContent value="image">
            <ImageStudio />
          </TabsContent>
          <TabsContent value="chat">
            <ChatPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ImageStudio() {
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [isFinal, setIsFinal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    setImage(null);
    setIsFinal(false);
    try {
      await streamImage("/api/generate-image", { prompt }, (dataUrl, final) => {
        setImage(dataUrl);
        setIsFinal(final);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-border bg-card rounded-xl border p-6 shadow-sm">
      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe the image you want to create..."
        className="min-h-24 resize-none"
      />
      <div className="mt-4 flex justify-end">
        <Button onClick={generate} disabled={loading || !prompt.trim()}>
          {loading ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 size-4" />
          )}
          Generate
        </Button>
      </div>

      {error && <p className="text-destructive mt-4 text-sm">{error}</p>}

      <div className="bg-muted mt-6 flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg">
        {image ? (
          <img
            src={image}
            alt={prompt}
            className={cn(
              "h-full w-full object-cover transition-[filter] duration-500",
              isFinal ? "blur-0" : "blur-2xl",
            )}
          />
        ) : (
          <p className="text-muted-foreground text-sm">
            {loading ? "Creating your image..." : "Your image will appear here"}
          </p>
        )}
      </div>
    </div>
  );
}

function ChatPanel() {
  const [input, setInput] = useState("");
  const [roast, setRoast] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);
  const { messages, sendMessage, status } = useChat({
    transport,
    onError: (err) => setError(err.message || "Chat failed"),
  });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    setError(null);
    void sendMessage({ text: input.trim() }, { body: { roast } });
    setInput("");
  };

  return (
    <div className="border-border bg-card flex h-[32rem] flex-col rounded-xl border shadow-sm">
      <div className="border-border flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm font-medium">Chat with Mujeeb AI</span>
        <div className="flex items-center gap-2">
          <Flame className={cn("size-4", roast ? "text-destructive" : "text-muted-foreground")} />
          <Label htmlFor="roast" className="text-sm">
            Roast Abaan
          </Label>
          <Switch id="roast" checked={roast} onCheckedChange={setRoast} />
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-muted-foreground text-center text-sm">
            Ask anything — or flip on Roast Abaan and let it rip.
          </p>
        )}
        {messages.map((message) => {
          const text = message.parts
            .map((part) => (part.type === "text" ? part.text : ""))
            .join("");
          if (!text) return null;
          return (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground",
                )}
              >
                <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1">
                  <ReactMarkdown>{text}</ReactMarkdown>
                </div>
              </div>
            </div>
          );
        })}
        {isLoading && (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" /> Thinking...
          </div>
        )}
        {error && <p className="text-destructive text-sm">{error}</p>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={submit} className="border-border flex gap-2 border-t p-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={roast ? "Say something about Abaan..." : "Type a message..."}
        />
        <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
