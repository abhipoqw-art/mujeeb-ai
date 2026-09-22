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
  Trash2,
  X,
} from "lucide-react";
import { streamImage } from "@/lib/stream-image";
import {
  CHAT_HISTORY_KEY,
  IMAGE_HISTORY_KEY,
  clearKey,
  loadJSON,
  saveJSON,
  type SavedImage,
} from "@/lib/local-history";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
const MUJI_PORTRAIT_URL = "/muji-portrait.jpg";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Muji AI (Mujeeb AI) — AI Image Generator & Chat" },
      {
        name: "description",
        content:
          "Muji AI, also known as Mujeeb AI, is a free AI image generator and chatbot by Muji — create images from text, edit photos, and chat with a playful roast mode.",
      },
      { property: "og:title", content: "Muji AI (Mujeeb AI) — AI Image Generator & Chat" },
      {
        property: "og:description",
        content:
          "Muji AI, also known as Mujeeb AI, is a free AI image generator and chatbot by Muji — create images from text, edit photos, and chat with a playful roast mode.",
      },
      { property: "og:url", content: "https://mujiai.lovable.app/" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://mujiai.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Muji AI",
          alternateName: ["Mujeeb AI", "Muji AI by Mujeeb"],
          url: "https://mujiai.lovable.app/",
          description:
            "Free AI image generator and chatbot — create images from text, edit photos, and chat with Muji AI.",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Muji AI",
          alternateName: "Mujeeb AI",
          applicationCategory: "MultimediaApplication",
          operatingSystem: "Web",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }),
      },
    ],
  }),
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 sm:py-6">
        <header className="relative mb-6 min-h-[25rem] max-h-[38rem] overflow-hidden rounded-lg sm:min-h-[31rem]">
          <img
            src={MUJI_PORTRAIT_URL}
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
  const [history, setHistory] = useState<SavedImage[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHistory(loadJSON<SavedImage[]>(IMAGE_HISTORY_KEY, []));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveJSON(IMAGE_HISTORY_KEY, history);
  }, [history, hydrated]);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  const remember = (dataUrl: string, usedPrompt: string) => {
    setHistory((prev) =>
      [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          prompt: usedPrompt,
          dataUrl,
          createdAt: Date.now(),
        },
      ].slice(-12),
    );
  };

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
          if (final) remember(dataUrl, prompt);
        });
      } else {
        await streamImage("/api/generate-image", { prompt }, (dataUrl, final) => {
          setImage(dataUrl);
          setIsFinal(final);
          if (final) remember(dataUrl, prompt);
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const download = async (target: string | null = image) => {
    if (!target) return;
    const image = target;
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
          <Button variant="outline" onClick={() => void download(image)}>
            <Download className="mr-2 size-4" /> Download
          </Button>
        </div>
      )}

      {history.length > 0 && (
        <div className="border-border mt-8 border-t pt-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium">Your images</span>
            <Button variant="ghost" size="sm" onClick={() => setHistory([])}>
              <Trash2 className="mr-2 size-4" /> Clear
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {[...history].reverse().map((item) => (
              <div key={item.id} className="group relative">
                <button
                  type="button"
                  onClick={() => {
                    setImage(item.dataUrl);
                    setIsFinal(true);
                    setPrompt(item.prompt);
                  }}
                  className="block w-full"
                  title={item.prompt}
                >
                  <img
                    src={item.dataUrl}
                    alt={item.prompt}
                    className="border-border aspect-square w-full rounded-md border object-cover"
                  />
                </button>
                <div className="absolute inset-x-1 bottom-1 flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="size-7"
                    aria-label="Download image"
                    onClick={() => void download(item.dataUrl)}
                  >
                    <Download className="size-3" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="size-7"
                    aria-label="Delete image"
                    onClick={() => setHistory((prev) => prev.filter((h) => h.id !== item.id))}
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
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
  const { messages, setMessages, sendMessage, status } = useChat({
    transport,
    onError: (err) => setError(err.message || "Chat failed"),
  });
  const [hydrated, setHydrated] = useState(false);

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    const saved = loadJSON<typeof messages>(CHAT_HISTORY_KEY, []);
    if (saved.length) setMessages(saved);
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated || isLoading) return;
    saveJSON(CHAT_HISTORY_KEY, messages);
  }, [messages, hydrated, isLoading]);

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
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Clear chat history"
              onClick={() => {
                setMessages([]);
                clearKey(CHAT_HISTORY_KEY);
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
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
