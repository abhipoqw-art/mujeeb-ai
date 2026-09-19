import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Aperture,
  ArrowDownRight,
  Bot,
  Check,
  ChevronDown,
  Clock3,
  Command,
  Copy,
  Download,
  ImagePlus,
  Layers3,
  MessageCircle,
  PanelRight,
  Plus,
  RotateCcw,
  ScanLine,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  WandSparkles,
  X,
  Zap,
} from 'lucide-react';
import { useGenerateImage } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const IMAGE_SRC = '/assets/abban.jpg';

type GenerationStatus = 'idle' | 'loading' | 'complete';
type ChatMessage = { role: 'user' | 'assistant'; text: string };
type AspectRatio = '1:1' | '4:5' | '16:9';
type ImageGenerationResult = {
  imageDataUrl: string;
  model: string;
  cost: number | null;
};

const presets = [
  { id: 'cover', label: 'Album cover', prompt: 'Abban as the mysterious cover star of an ambient album called “Please Hold”, fog machine, chrome type, suspiciously expensive lighting' },
  { id: 'portrait', label: 'Editorial portrait', prompt: 'A precise editorial portrait of Abban in an architectural gallery, soft tungsten, dramatic negative space, impossibly calm expression' },
  { id: 'launch', label: 'Product launch', prompt: 'Abban unveiling a tiny satellite to a room of very impressed pigeons, high-end product launch photography, controlled chaos' },
  { id: 'roast', label: 'Gentle roast', prompt: 'Abban as the CEO of a company that makes one extremely complicated button, cinematic boardroom, friendly absurdity' },
];

const roastPresets = [
  { title: 'CEO of doing nothing', copy: 'Place Abban in a boardroom where every slide is a tasteful portrait of Abban. Give him the confidence of a man who invented the chair.' },
  { title: 'Main character protocol', copy: 'Turn Abban into a prestige television detective whose only clue is that he has not replied to the group chat.' },
  { title: 'Mujeeb’s choice', copy: 'Make Abban look ready to negotiate with a vending machine. Premium editorial lighting. The vending machine has leverage.' },
];

const loadingPhrases = [
  'Calibrating unnecessary confidence…',
  'Teaching pixels about Abban…',
  'Applying tasteful amounts of drama…',
  'Consulting the Mujeeb archives…',
];

const generatedHistory = [
  { name: 'Initial scan / Abban', meta: 'Portrait · 4:5', tone: 'teal' },
  { name: 'The boardroom incident', meta: 'Roast · 16:9', tone: 'orange' },
  { name: 'Satellite diplomacy', meta: 'Cinematic · 1:1', tone: 'violet' },
];

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function Header({ mujeebMode, setMujeebMode }: { mujeebMode: boolean; setMujeebMode: (value: boolean) => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[hsl(var(--border)/.7)] bg-[hsl(var(--background)/.9)] backdrop-blur-xl">
      <div className="mx-auto flex h-[4.5rem] max-w-[1320px] items-center justify-between px-5 lg:px-9">
        <button className="flex items-center gap-3" onClick={() => scrollToId('top')} aria-label="Back to top">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--accent))]">
            <Aperture size={18} strokeWidth={1.8} />
          </span>
          <span className="display text-[1.05rem] font-bold tracking-[-.04em]">MUJEEB<span className="text-[hsl(var(--secondary))]"> AI</span></span>
        </button>
        <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
          <a className="nav-link" href="#studio">The lab</a>
          <a className="nav-link" href="#gallery">Output gallery</a>
          <a className="nav-link" href="#roast">Roast mode</a>
          <a className="nav-link" href="#about">Why this exists</a>
        </nav>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-2 font-mono text-[.62rem] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))] sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--secondary))] shadow-[0_0_0_4px_hsl(var(--secondary)/.12)]" /> System nominal
          </span>
          <button className={`toggle ${mujeebMode ? 'on' : ''}`} onClick={() => setMujeebMode(!mujeebMode)} aria-label="Toggle Mujeeb mode" aria-pressed={mujeebMode}>
            <span />
          </button>
          <span className="hidden font-mono text-[.62rem] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))] lg:block">Mujeeb mode</span>
        </div>
      </div>
    </header>
  );
}

function Hero({ onStart }: { onStart: () => void }) {
  return (
    <section id="top" className="grid-lines relative mx-auto grid min-h-[calc(100dvh-4.5rem)] max-w-[1320px] items-center gap-12 overflow-hidden px-5 py-16 lg:grid-cols-[1.05fr_.95fr] lg:gap-20 lg:px-9 lg:py-20">
      <div className="reveal relative z-10">
        <div className="eyebrow mb-7 flex items-center gap-3"><span className="h-px w-9 bg-[hsl(var(--secondary))]" /> Private beta / image intelligence</div>
        <h1 className="display max-w-[760px] text-[clamp(3.6rem,8.4vw,8rem)] font-semibold leading-[.86] tracking-[-.085em] text-[hsl(var(--foreground))]">
          The world&apos;s most <span className="relative inline-block text-[hsl(var(--secondary))]">unnecessarily</span> powerful image generator.
        </h1>
        <p className="mt-8 max-w-[550px] text-[1rem] leading-7 text-[hsl(var(--muted-foreground))]">
          A serious creative instrument for people who need cinematic visuals, precise control, and the occasional portrait of Abban looking like he has a plan.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          <button className="btn-ink" onClick={onStart}><WandSparkles size={16} /> Open the image lab <ArrowDownRight size={15} /></button>
          <a className="btn-ghost" href="#gallery"><Layers3 size={15} /> View recent outputs</a>
        </div>
        <div className="mt-14 flex flex-wrap gap-x-8 gap-y-3 border-t border-[hsl(var(--border))] pt-5">
          <div><p className="mono text-[.63rem] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">Render confidence</p><p className="display mt-1 text-lg font-semibold">96.4<span className="text-[hsl(var(--secondary))]">%</span></p></div>
          <div><p className="mono text-[.63rem] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">Unnecessary power</p><p className="display mt-1 text-lg font-semibold">8.7<span className="text-[hsl(var(--secondary))]">/10</span></p></div>
          <div><p className="mono text-[.63rem] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">Pigeons consulted</p><p className="display mt-1 text-lg font-semibold">14,208</p></div>
        </div>
      </div>
      <div className="reveal reveal-delay-2 relative mx-auto w-full max-w-[480px] lg:justify-self-end">
        <div className="hero-orbit -right-9 -top-10 h-[350px] w-[350px] md:h-[470px] md:w-[470px]" />
        <div className="hero-orbit -bottom-10 -left-10 h-[220px] w-[220px] border-dashed" />
        <div className="relative aspect-[.87] w-[82%] md:w-[79%]">
          <div className="subject-frame h-full w-full">
            <img src={IMAGE_SRC} alt="Abban wearing sunglasses, featured subject" />
            <div className="scanline" />
            <div className="absolute left-4 top-4 z-10 flex items-center gap-2 font-mono text-[.6rem] uppercase tracking-[.12em] text-[hsl(var(--accent))]"><ScanLine size={13} /> Subject lock: 01</div>
            <div className="absolute bottom-4 left-4 z-10 right-4 flex items-end justify-between font-mono text-[.59rem] uppercase tracking-[.09em] text-[hsl(var(--background)/.8)]">
              <span>Facial calibration<br /><b className="text-[hsl(var(--accent))]">exceptionally serious</b></span><span>01 / 01</span>
            </div>
          </div>
        </div>
        <div className="absolute -bottom-5 right-0 z-10 max-w-[240px] border border-[hsl(var(--foreground))] bg-[hsl(var(--accent))] p-4 shadow-[8px_8px_0_hsl(var(--foreground))]">
          <p className="mono text-[.6rem] uppercase tracking-[.1em]">Featured subject</p>
          <p className="display mt-1 text-2xl font-bold tracking-[-.05em]">Abban</p>
          <p className="mt-1 text-[.68rem] leading-4">A naturally occurring phenomenon in premium sunglasses.</p>
        </div>
      </div>
    </section>
  );
}

function PromptPresets({ active, onPick }: { active: string; onPick: (preset: typeof presets[number]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {presets.map((preset) => <button key={preset.id} className={`preset-chip ${active === preset.id ? 'active' : ''}`} onClick={() => onPick(preset)}>{preset.label}</button>)}
    </div>
  );
}

function Lab({ onGenerated, onRequestGenerate, mujeebMode, promptSeed, regenerateKey }: { onGenerated: (prompt: string, style: string, imageDataUrl: string) => void; onRequestGenerate: (input: { prompt: string; aspectRatio: AspectRatio; style: string; useReference: boolean }) => Promise<ImageGenerationResult>; mujeebMode: boolean; promptSeed: string; regenerateKey: number }) {
  const [prompt, setPrompt] = useState(promptSeed);
  const [activePreset, setActivePreset] = useState('cover');
  const [aspect, setAspect] = useState<AspectRatio>('4:5');
  const [style, setStyle] = useState('Cinematic');
  const [reference, setReference] = useState(true);
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [phrase, setPhrase] = useState(loadingPhrases[0]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status !== 'loading') return;
    let index = 0;
    const interval = window.setInterval(() => {
      index = (index + 1) % loadingPhrases.length;
      setPhrase(loadingPhrases[index]);
    }, 860);
    return () => window.clearInterval(interval);
  }, [status]);

  useEffect(() => {
    if (promptSeed) {
      setPrompt(promptSeed);
      setActivePreset('');
    }
  }, [promptSeed]);

  useEffect(() => {
    if (regenerateKey > 0) {
      void runGeneration();
    }
  }, [regenerateKey]);

  const selectPreset = (preset: typeof presets[number]) => {
    setActivePreset(preset.id);
    setPrompt(preset.prompt);
  };

  const runGeneration = async () => {
    if (!prompt.trim() || status === 'loading') return;
    setStatus('loading');
    setPhrase(loadingPhrases[0]);
    setError('');
    window.setTimeout(() => scrollToId('gallery'), 100);
    try {
      const result = await onRequestGenerate({
        prompt: prompt.trim(),
        aspectRatio: aspect,
        style,
        useReference: reference,
      });
      setStatus('complete');
      onGenerated(prompt.trim(), style, result.imageDataUrl);
    } catch (requestError) {
      setStatus('idle');
      setError(requestError instanceof Error ? requestError.message : 'The image provider could not complete this render.');
    }
  };

  const generate = () => {
    void runGeneration();
  };

  return (
    <section id="studio" className="mx-auto max-w-[1320px] scroll-mt-20 px-5 py-24 lg:px-9">
      <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
        <div><div className="eyebrow mb-3">01 / The image lab</div><h2 className="display text-4xl font-semibold tracking-[-.06em] md:text-6xl">Give it a reason<br /><span className="text-[hsl(var(--secondary))]">to overperform.</span></h2></div>
        <div className="flex items-center gap-2 border border-[hsl(var(--border))] bg-[hsl(var(--card)/.45)] px-3 py-2 font-mono text-[.61rem] uppercase tracking-[.11em] text-[hsl(var(--muted-foreground))]"><ShieldCheck size={14} className="text-[hsl(var(--secondary))]" /> Private session / local mock</div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.08fr_.92fr]">
        <div className="lab-card p-5 md:p-7">
          <div className="mb-6 flex items-center justify-between"><div><p className="mono text-[.62rem] uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">Prompt sequence</p><p className="mt-1 text-sm font-semibold">Describe the impossible</p></div><Command size={17} className="text-[hsl(var(--muted-foreground))]" /></div>
          <label className="control-label" htmlFor="prompt">Creative brief</label>
          <textarea id="prompt" value={prompt} onChange={(event) => { setPrompt(event.target.value); setActivePreset(''); }} className="control-input min-h-[156px] resize-none p-4 text-[.92rem] leading-6" />
          <div className="mt-4"><p className="control-label">Fast start presets</p><PromptPresets active={activePreset} onPick={selectPreset} /></div>
          <div className="mt-7 grid gap-5 border-t border-[hsl(var(--border))] pt-6 sm:grid-cols-2">
            <div><label className="control-label">Aspect ratio</label><div className="segmented">{(['1:1', '4:5', '16:9'] as AspectRatio[]).map((item) => <button key={item} className={aspect === item ? 'active' : ''} onClick={() => setAspect(item)}>{item}</button>)}</div></div>
            <div><label className="control-label">Visual language</label><div className="relative"><select className="control-input appearance-none px-3 py-[.62rem] text-[.73rem]" value={style} onChange={(event) => setStyle(event.target.value)}><option>Cinematic</option><option>Editorial flash</option><option>Soft surreal</option><option>Documentary</option></select><ChevronDown className="pointer-events-none absolute right-3 top-2.5 text-[hsl(var(--muted-foreground))]" size={14} /></div></div>
          </div>
          <div className="mt-6 flex items-center justify-between rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.4)] p-3">
            <div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center overflow-hidden rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))]"><img src={IMAGE_SRC} alt="" className="h-full w-full object-cover" /></div><div><p className="text-[.72rem] font-bold">Reference image</p><p className="mono text-[.59rem] text-[hsl(var(--muted-foreground))]">Featured subject: Abban</p></div></div>
            <button className={`btn-ghost min-h-8 px-3 py-1.5 text-[.65rem] ${reference ? 'border-[hsl(var(--secondary))] text-[hsl(var(--secondary))]' : ''}`} onClick={() => setReference(!reference)}>{reference ? <><Check size={13} /> Attached</> : <><ImagePlus size={13} /> Attach</>}</button>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><p className="mono max-w-[290px] text-[.6rem] leading-4 text-[hsl(var(--muted-foreground))]">{mujeebMode ? 'Mujeeb mode will add one tasteful problem to this prompt.' : 'Generation is local, temporary, and weirdly overqualified.'}</p><button className="btn-primary" onClick={generate} disabled={status === 'loading'}>{status === 'loading' ? <><RotateCcw size={15} className="animate-spin" /> Rendering</> : <><Sparkles size={15} /> Generate image</>}</button></div>
          {status === 'loading' && <div className="mt-5 border-t border-[hsl(var(--border))] pt-4"><div className="mb-2 flex justify-between mono text-[.62rem] uppercase tracking-[.09em]"><span className="text-[hsl(var(--secondary))]">{phrase}</span><span>OpenRouter</span></div><div className="h-1 overflow-hidden rounded-full bg-[hsl(var(--muted))]"><div className="h-full w-[62%] animate-pulse rounded-full bg-[hsl(var(--secondary))]" /></div></div>}
          {error && <p className="mt-4 border-t border-[hsl(var(--destructive)/.3)] pt-4 text-[.7rem] leading-5 text-[hsl(var(--destructive))]">{error}</p>}
        </div>
        <div className="relative min-h-[440px] overflow-hidden rounded-[1.2rem] border border-[hsl(var(--foreground)/.25)] bg-[hsl(var(--foreground))] p-6 text-[hsl(var(--background))] md:p-8">
          <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full border border-[hsl(var(--accent)/.28)]" /><div className="absolute right-10 top-10 h-3 w-3 rounded-full bg-[hsl(var(--accent))]" />
          <div className="relative z-10 flex h-full min-h-[390px] flex-col justify-between">
            <div className="flex items-start justify-between"><div><p className="mono text-[.62rem] uppercase tracking-[.14em] text-[hsl(var(--accent))]">Control surface / 004</p><h3 className="display mt-3 text-3xl font-semibold tracking-[-.06em]">Reference<br />intelligence</h3></div><SlidersHorizontal className="text-[hsl(var(--accent))]" size={22} /></div>
            <div className="my-7 flex items-center gap-3"><div className="h-px flex-1 bg-[hsl(var(--background)/.2)]" /><span className="mono text-[.57rem] uppercase tracking-[.13em] text-[hsl(var(--background)/.55)]">Image / subject / intent</span><div className="h-px flex-1 bg-[hsl(var(--background)/.2)]" /></div>
            <div className="space-y-4 font-mono text-[.65rem] uppercase tracking-[.1em] text-[hsl(var(--background)/.62)]"><div className="flex justify-between border-b border-[hsl(var(--background)/.15)] pb-3"><span>Reference fidelity</span><span className="text-[hsl(var(--accent))]">High / 0.91</span></div><div className="flex justify-between border-b border-[hsl(var(--background)/.15)] pb-3"><span>Drama allocation</span><span className="text-[hsl(var(--accent))]">Excessive</span></div><div className="flex justify-between border-b border-[hsl(var(--background)/.15)] pb-3"><span>Roast safety</span><span className="text-[hsl(var(--accent))]">Friendly</span></div></div>
            <div className="mt-8 flex items-end justify-between"><p className="max-w-[220px] text-[.72rem] leading-5 text-[hsl(var(--background)/.68)]">Every dial has a purpose. Some purposes are hard to defend.</p><div className="grid h-12 w-12 place-items-center rounded-full border border-[hsl(var(--accent)/.6)] text-[hsl(var(--accent))]"><Zap size={17} /></div></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Gallery({ lastPrompt, lastStyle, generatedImage, onRegenerate }: { lastPrompt: string; lastStyle: string; generatedImage: string | null; onRegenerate: () => void }) {
  const [copied, setCopied] = useState(false);
  const copyPrompt = () => {
    navigator.clipboard?.writeText(lastPrompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };
  return (
    <section id="gallery" className="scroll-mt-20 border-y border-[hsl(var(--border))] bg-[hsl(var(--muted)/.42)]">
      <div className="mx-auto max-w-[1320px] px-5 py-24 lg:px-9">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-5"><div><div className="eyebrow mb-3">02 / Output gallery</div><h2 className="display text-4xl font-semibold tracking-[-.06em] md:text-6xl">Generated by<br /><span className="text-[hsl(var(--secondary))]">Mujeeb AI.</span></h2></div><p className="max-w-[270px] text-sm leading-6 text-[hsl(var(--muted-foreground))]">No waiting room. No mysterious black box. Just a very confident local simulation.</p></div>
        <div className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
          <div className="relative min-h-[480px] overflow-hidden rounded-[1.2rem] bg-[hsl(var(--foreground))] p-3 md:p-5">
            <div className="relative h-full min-h-[440px] overflow-hidden rounded-[.8rem] border border-[hsl(var(--background)/.25)]">
              <img src={generatedImage || IMAGE_SRC} alt="Generated cinematic portrait of Abban" className="absolute inset-0 h-full w-full object-cover object-center brightness-[.75] saturate-[.75]" />
              <div className="absolute inset-0 bg-[linear-gradient(145deg,hsl(188_92%_38%/.33),transparent_35%,hsl(222_24%_15%/.55))]" />
               <div className="absolute left-5 top-5 flex items-center gap-2 font-mono text-[.59rem] uppercase tracking-[.12em] text-[hsl(var(--accent))]"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" /> {generatedImage ? 'OpenRouter render complete' : 'Reference render / local preview'}</div>
              <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between text-[hsl(var(--background))]"><div><p className="mono text-[.59rem] uppercase tracking-[.12em] text-[hsl(var(--accent))]">Mujeeb study 001</p><h3 className="display mt-1 text-3xl font-semibold tracking-[-.06em]">Abban, in<br />a serious mood.</h3></div><span className="mono text-[.58rem]">04:05:26 / M-AI</span></div>
            </div>
          </div>
          <div className="lab-card flex flex-col justify-between p-6 md:p-8">
            <div><div className="flex items-center justify-between"><span className="eyebrow">Render manifest</span><span className="rounded-full bg-[hsl(var(--accent))] px-2.5 py-1 font-mono text-[.58rem] uppercase tracking-[.1em]">Approved-ish</span></div><h3 className="display mt-7 text-3xl font-semibold leading-tight tracking-[-.06em]">A cinematic<br />overreaction.</h3><div className="mt-8 space-y-4 text-[.72rem]"><div className="flex justify-between border-b border-[hsl(var(--border))] pb-3"><span className="text-[hsl(var(--muted-foreground))]">Style profile</span><b>{lastStyle}</b></div><div className="flex justify-between border-b border-[hsl(var(--border))] pb-3"><span className="text-[hsl(var(--muted-foreground))]">Reference</span><b>Abban / 01</b></div><div className="flex justify-between border-b border-[hsl(var(--border))] pb-3"><span className="text-[hsl(var(--muted-foreground))]">Composition</span><b>Hero portrait</b></div></div><div className="mt-7 rounded-lg bg-[hsl(var(--muted)/.55)] p-3"><p className="mono mb-2 text-[.58rem] uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">Active prompt</p><p className="line-clamp-3 text-[.73rem] leading-5">{lastPrompt}</p></div></div>
             <div className="mt-8 flex flex-wrap gap-2"><button className="btn-ink" onClick={onRegenerate}><RotateCcw size={14} /> Regenerate</button><button className="btn-ghost" onClick={copyPrompt}>{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy prompt'}</button><a className="btn-ghost" href={generatedImage || IMAGE_SRC} download="mujeeb-abban-study.jpg"><Download size={14} /> Save</a></div>
          </div>
        </div>
        <div className="mt-12"><div className="mb-4 flex items-center justify-between"><p className="eyebrow">Generation history</p><button className="mono text-[.6rem] uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--secondary))]" onClick={() => scrollToId('studio')}>New sequence <Plus size={13} className="ml-1 inline" /></button></div><div className="grid gap-3 md:grid-cols-3">{generatedHistory.map((item) => <div className="history-tile group" key={item.name}><div className={`relative h-[8.5rem] overflow-hidden bg-[hsl(var(--${item.tone === 'teal' ? 'secondary' : item.tone === 'orange' ? 'accent' : 'foreground'}))]`}><img src={IMAGE_SRC} alt="" className={`h-full w-full object-cover ${item.tone === 'orange' ? 'rotate-2 scale-110 sepia-[.25]' : item.tone === 'violet' ? 'scale-110 grayscale' : ''}`} /><div className="absolute inset-0 bg-[hsl(var(--foreground)/.25)]" /></div><div className="flex items-center justify-between p-3"><div><p className="text-[.7rem] font-bold">{item.name}</p><p className="mono mt-1 text-[.58rem] text-[hsl(var(--muted-foreground))]">{item.meta}</p></div><Clock3 size={14} className="text-[hsl(var(--muted-foreground))]" /></div></div>)}</div></div>
      </div>
    </section>
  );
}

function RoastMode({ mujeebMode, setMujeebMode, onUsePrompt }: { mujeebMode: boolean; setMujeebMode: (value: boolean) => void; onUsePrompt: (prompt: string) => void }) {
  return (
    <section id="roast" className="roast-band scroll-mt-20">
      <div className="mx-auto max-w-[1320px] px-5 py-24 lg:px-9">
        <div className="relative z-10 grid gap-14 lg:grid-cols-[.82fr_1.18fr] lg:items-end">
          <div><div className="eyebrow mb-4 text-[hsl(var(--accent))]">03 / The private joke</div><h2 className="display text-5xl font-semibold leading-[.92] tracking-[-.07em] md:text-7xl">Turn on<br /><span className="text-[hsl(var(--accent))]">Mujeeb mode.</span></h2><p className="mt-7 max-w-[400px] text-sm leading-6 text-[hsl(var(--background)/.64)]">A highly advanced setting that adds exactly one unnecessary complication and calls it creative direction.</p><div className="mt-8 flex items-center gap-3"><button className={`toggle ${mujeebMode ? 'on' : ''}`} onClick={() => setMujeebMode(!mujeebMode)} aria-label="Toggle Mujeeb mode" aria-pressed={mujeebMode}><span /></button><span className="mono text-[.65rem] uppercase tracking-[.13em] text-[hsl(var(--accent))]">{mujeebMode ? 'Active / proceed recklessly' : 'Standby / too sensible'}</span></div></div>
          <div className="grid gap-3 md:grid-cols-3">{roastPresets.map((roast, index) => <button key={roast.title} className="group border border-[hsl(var(--background)/.18)] bg-[hsl(var(--background)/.06)] p-5 text-left transition-colors hover:border-[hsl(var(--accent)/.7)] hover:bg-[hsl(var(--accent)/.1)]" onClick={() => onUsePrompt(roast.copy)}><div className="mb-10 flex items-center justify-between"><span className="mono text-[.58rem] text-[hsl(var(--accent))]">0{index + 1}</span><ArrowDownRight size={15} className="text-[hsl(var(--background)/.45)] transition-transform group-hover:translate-x-1 group-hover:translate-y-1" /></div><p className="display text-xl font-semibold tracking-[-.04em]">{roast.title}</p><p className="mt-3 text-[.7rem] leading-5 text-[hsl(var(--background)/.58)]">{roast.copy}</p></button>)}</div>
        </div>
      </div>
    </section>
  );
}

function ChatPanel({ mujeebMode }: { mujeebMode: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'assistant', text: 'Mujeeb AI online. I have reviewed the reference image and can confirm: Abban is ready for an unnecessary amount of production value.' }]);
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(true);
  const [isThinking, setIsThinking] = useState(false);
  const send = () => {
    const text = input.trim();
    if (!text || isThinking) return;
    setMessages((current) => [...current, { role: 'user', text }]);
    setInput('');
    setIsThinking(true);
    window.setTimeout(() => {
      const normalized = text.toLowerCase();
      const reply = normalized.includes('roast') || normalized.includes('insult')
        ? 'With respect: this prompt has the posture of a keynote and the preparation of a group chat message. I can make it cinematic.'
        : normalized.includes('prompt') || normalized.includes('idea')
          ? 'A strong direction. Add 14% more atmosphere, one unnecessary prop, and a detail nobody requested. Shall we proceed?'
          : mujeebMode
            ? 'Excellent. Mujeeb mode has added a tasteful subplot involving a vending machine. The pixels are unusually confident.'
            : 'Noted. I would add 14% more atmosphere and one detail nobody requested. That is the responsible creative choice.';
      setMessages((current) => [...current, { role: 'assistant', text: reply }]);
      setIsThinking(false);
    }, 500);
  };
  return (
    <section id="about" className="mx-auto max-w-[1320px] scroll-mt-20 px-5 py-24 lg:px-9">
      <div className="grid gap-10 lg:grid-cols-[1fr_390px] lg:items-start">
        <div><div className="eyebrow mb-4">04 / Your creative operator</div><h2 className="display max-w-[700px] text-4xl font-semibold tracking-[-.07em] md:text-6xl">Powerful enough<br />to be <span className="text-[hsl(var(--secondary))]">a little silly.</span></h2><div className="mt-9 grid max-w-[700px] gap-6 border-t border-[hsl(var(--border))] pt-7 sm:grid-cols-2"><div><Bot size={18} className="text-[hsl(var(--secondary))]" /><h3 className="mt-4 text-sm font-bold">Believable controls</h3><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Prompt presets, reference fidelity, visual language and output history — all the knobs a real creative tool should have.</p></div><div><MessageCircle size={18} className="text-[hsl(var(--secondary))]" /><h3 className="mt-4 text-sm font-bold">Friendly mischief</h3><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Roasts stay fictional, absurd and kind. Mujeeb AI knows the difference between a joke and a bad idea.</p></div></div><div className="mt-14 flex flex-wrap gap-x-10 gap-y-5"><div><p className="mono text-[.6rem] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">Average overthinking</p><p className="display mt-1 text-3xl font-semibold">47.2<span className="text-[hsl(var(--secondary))]">%</span></p></div><div><p className="mono text-[.6rem] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">Prompts made dramatic</p><p className="display mt-1 text-3xl font-semibold">8,631</p></div><div><p className="mono text-[.6rem] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">Actual satellites</p><p className="display mt-1 text-3xl font-semibold">0<span className="text-[hsl(var(--secondary))]">.0</span></p></div></div></div>
       <div className="lab-card overflow-hidden"><div className="flex items-center justify-between border-b border-[hsl(var(--border))] p-4"><div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--accent))]"><Bot size={14} /></span><div><p className="text-[.7rem] font-bold">Ask Mujeeb</p><p className="mono text-[.55rem] uppercase tracking-[.1em] text-[hsl(var(--secondary))]">local creative operator</p></div></div><button type="button" onClick={() => setOpen(!open)} className="text-[hsl(var(--muted-foreground))]" aria-label={open ? 'Close chat' : 'Open chat'}>{open ? <X size={15} /> : <PanelRight size={15} />}</button></div>{open && <><div className="flex min-h-[260px] flex-col gap-3 p-4">{messages.map((message, index) => <div className={`chat-bubble ${message.role === 'user' ? 'user' : ''}`} key={`${message.role}-${index}`}>{message.text}</div>)}{isThinking && <div className="chat-bubble">Mujeeb is considering the dramatic implications…</div>}</div><form className="flex gap-2 border-t border-[hsl(var(--border))] p-3" onSubmit={(event) => { event.preventDefault(); send(); }}><input value={input} onChange={(event) => setInput(event.target.value)} className="control-input min-h-10 px-3 text-[.7rem]" placeholder="Ask for a tasteful overreaction…" aria-label="Message Mujeeb" /><button type="submit" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[hsl(var(--foreground))] text-[hsl(var(--accent))]" onClick={send} disabled={isThinking} aria-label="Send message"><Send size={15} /></button></form></>}</div>
      </div>
    </section>
  );
}

function Footer() {
  return <footer className="border-t border-[hsl(var(--border))]"><div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-5 px-5 py-8 lg:px-9"><div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--accent))]"><Aperture size={15} /></span><span className="display font-bold tracking-[-.04em]">MUJEEB AI</span></div><p className="mono text-[.58rem] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">Generated locally · For Abban-related creative emergencies</p><p className="mono text-[.58rem] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">v0.4.7 / no satellites harmed</p></div></footer>;
}

function Home() {
  const [mujeebMode, setMujeebMode] = useState(false);
  const [lastPrompt, setLastPrompt] = useState(presets[0].prompt);
  const [lastStyle, setLastStyle] = useState('Cinematic');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [regenerateKey, setRegenerateKey] = useState(0);
  const lastGenerated = useRef({ prompt: lastPrompt, style: lastStyle });
  const imageMutation = useGenerateImage();
  const handleGenerated = (prompt: string, style: string, imageDataUrl: string) => {
    lastGenerated.current = { prompt, style };
    setLastPrompt(prompt);
    setLastStyle(style);
    setGeneratedImage(imageDataUrl);
  };
  const stableHandleGenerated = useMemo(() => handleGenerated, []);
  const handleRoastPrompt = (prompt: string) => {
    setLastPrompt(prompt);
    scrollToId('studio');
  };
  const handleRegenerate = () => {
    setRegenerateKey((key) => key + 1);
    scrollToId('studio');
  };
  useEffect(() => {
    document.title = 'Mujeeb AI — Unnecessarily powerful image generation';
  }, []);
  return (
    <div className="app-shell noise">
      <Header mujeebMode={mujeebMode} setMujeebMode={setMujeebMode} />
      <main>
        <Hero onStart={() => scrollToId('studio')} />
        <Lab onGenerated={stableHandleGenerated} onRequestGenerate={(input) => imageMutation.mutateAsync({ data: input })} mujeebMode={mujeebMode} promptSeed={lastPrompt} regenerateKey={regenerateKey} />
        <Gallery lastPrompt={lastPrompt} lastStyle={lastStyle} generatedImage={generatedImage} onRegenerate={handleRegenerate} />
        <RoastMode mujeebMode={mujeebMode} setMujeebMode={setMujeebMode} onUsePrompt={handleRoastPrompt} />
        <ChatPanel mujeebMode={mujeebMode} />
      </main>
      <Footer />
    </div>
  );
}

function Router() {
  return <RoutedErrorBoundary><Switch><Route path="/" component={Home} /><Route component={NotFound} /></Switch></RoutedErrorBoundary>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;