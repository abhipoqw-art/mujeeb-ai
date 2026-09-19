import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Download,
  Flame,
  ImageIcon,
  Loader2,
  MessageSquare,
  Paperclip,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { streamImage } from "@/lib/stream-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import mujiPortrait from "@/assets/muji-portrait.jpg.asset.json";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Muji AI — Image Studio & Chat" },
      {
        name: "description",
        content:
          "Meet Muji AI, create images from text, and chat with a playful roast mode for Abaan.",
      },
      { property: "og:title", content: "Muji AI — Image Studio & Chat" },
      {
        property: "og:description",
        content:
          "Meet Muji AI, create images from text, and chat with a playful roast mode for Abaan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 sm:py-6">
        <header className="relative mb-6 min-h-[25rem] max-h-[38rem] overflow-hidden rounded-lg sm:min-h-[31rem]">
          <img
            src={mujiPortrait.url}
            alt="Muji wearing sunglasses"
            className="absolute inset-0 h-full w-full object-cover object-center sm:object-[center_43%]"
          />
          <div className="bg-hero-scrim absolute inset-0" />
          <div className="absolute inset-x-0 bottom-0 px-6 pb-7 sm:px-10 sm:pb-10">
            <p className="mb-2 text-sm font-medium uppercase text-hero-foreground/80">
              Meet your new creative sidekick
            </p>
            <h1 className="max-w-2xl text-4xl font-bold text-hero-foreground sm:text-6xl">
              Hi, I’m Muji AI.
            </h1>
          </div>
        </header>

        <Tabs defaultValue="image" className="scroll-mt-4">
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
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  const generate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    setImage(null);
    setIsFinal(false);
    try {
      if (files.length > 0) {
        const form = new FormData();
        form.append("prompt", prompt);
        for (const file of files) form.append("image[]", file);
        await streamImage("/api/edit-image", form, (dataUrl, final) => {
          setImage(dataUrl);
          setIsFinal(final);
        });
      } else {
        await streamImage("/api/generate-image", { prompt }, (dataUrl, final) => {
          setImage(dataUrl);
          setIsFinal(final);
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const download = async () => {
    if (!image) return;
    try {
      // Convert the data URL to a real file blob so the browser saves it to the device
      const blob = await (await fetch(image)).blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `muji-ai-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {
      // Fallback: open in a new tab so it can be saved manually
      window.open(image, "_blank");
    }
  };

  return (
    <div className="border-border bg-card rounded-xl border p-6 shadow-sm">
      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={
          files.length > 0
            ? "Describe how to change the attached image..."
            : "Describe the image you want to create..."
        }
        className="min-h-24 resize-none"
      />

      {previews.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {previews.map((src, i) => (
            <div key={src} className="relative">
              <img
                src={src}
                alt={files[i]?.name ?? "Attached image"}
                className="border-border size-20 rounded-md border object-cover"
              />
              <button
                type="button"
                onClick={() => setFiles((prev) => prev.filter((_, index) => index !== i))}
                className="bg-background border-border absolute -right-2 -top-2 rounded-full border p-1 shadow-sm"
                aria-label="Remove attached image"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const selected = Array.from(e.target.files ?? []);
          if (selected.length) setFiles((prev) => [...prev, ...selected]);
          e.target.value = "";
        }}
      />

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
          <Paperclip className="mr-2 size-4" /> Attach image
        </Button>
        <Button onClick={generate} disabled={loading || !prompt.trim()}>
          {loading ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 size-4" />
          )}
          {files.length > 0 ? "Modify" : "Generate"}
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

      {image && isFinal && (
        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={download}>
            <Download className="mr-2 size-4" /> Download
          </Button>
        </div>
      )}
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
        <span className="text-sm font-medium">Chat with Muji AI</span>
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
