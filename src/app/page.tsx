'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Radio,
  MessageSquare,
  Globe2,
  ShieldCheck,
  WifiOff,
  Languages,
} from 'lucide-react';
import { ThemeSwitcher } from '@/components/theme-switcher';

export default function Home() {
  return (
    <div className="min-h-screen app-surface font-body">
      <div className="absolute inset-0 bg-noise opacity-40 mix-blend-soft-light pointer-events-none fixed" />
      <ThemeSwitcher />

      {/* Top bar */}
      <header className="relative z-10">
        <div className="container mx-auto px-4 md:px-6 pt-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-white/85 border border-border shadow-sm flex items-center justify-center">
              <span className="font-headline font-bold text-primary">S</span>
            </div>
            <span className="font-headline font-bold text-foreground text-lg tracking-tight">Sarthi.AI</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" className="h-10 px-4">
                Login
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="h-10 px-4 shadow-lg shadow-primary/20">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-12 md:pt-16 md:pb-16 overflow-hidden">
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="grid lg:grid-cols-1 gap-10 items-center">
            <div className="flex flex-col items-center text-center space-y-6 animate-[page-fade_420ms_ease]">
              <Badge className="w-fit bg-primary/10 text-primary border-primary/20 px-4 py-1.5 text-sm font-medium">
                <Sparkles className="w-4 h-4 mr-2" />
                Just-in-time AI coach for teachers like Sunita
              </Badge>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold font-headline text-foreground leading-[1.1] tracking-tight">
                Sarthi<span className="text-primary">.AI</span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl leading-relaxed">
                Real-time, context-aware support for teachers facing multi-level classrooms, chaos, and conceptual blocks. Offline-first, voice-friendly, and bilingual (English/Hindi) for government schools.
              </p>
              <div className="flex gap-3">
                <Badge className="bg-primary/10 text-primary border-primary/20">Offline / low-bandwidth ready</Badge>
                <Badge className="bg-primary/10 text-primary border-primary/20 flex items-center gap-1">
                  <Languages className="w-4 h-4" /> English / Hindi
                </Badge>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <Link href="/teacher-companion" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:min-w-[170px] h-12 text-base shadow-lg shadow-primary/20">
                    Open Teacher Companion
                  </Button>
                </Link>
                <Link href="/signup" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full sm:min-w-[170px] h-12 text-base border-border">
                    Sign Up Free
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Teacher Companion highlights */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-6 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3 animate-[page-fade_360ms_ease]">
            <h3 className="text-3xl md:text-4xl font-headline font-bold text-foreground">Built for real classrooms</h3>
            <p className="text-muted-foreground">Instant, context-aware help for busy teachers—voice, image, and offline-ready.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {([
              { title: 'Just-in-time coaching', desc: 'Ask and get a precise, actionable pivot in minutes.', icon: Radio },
              { title: 'Voice + image input', desc: 'Describe or upload a board/activity photo for grouping and tweaks.', icon: MessageSquare },
              { title: 'Offline-friendly', desc: 'Last 20 answers cached for low-bandwidth schools.', icon: WifiOff },
              { title: 'Bilingual + quick', desc: 'English / Hindi guidance with short, ready-to-use steps.', icon: Languages },
              { title: 'Classroom pivots', desc: 'Context-aware hooks for confusion, chaos, mixed ability, or behavior.', icon: ShieldCheck },
              { title: 'Fits your workflow', desc: 'Share quick updates; shorten query-to-resolution dramatically.', icon: Globe2 },
            ] as const).map((f, idx) => (
              <Card
                key={f.title}
                className="section-card group relative overflow-hidden hover:translate-y-[-6px] transition-transform duration-200 animate-[page-fade_460ms_ease]"
                style={{ animationDelay: `${idx * 70}ms` }}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(circle_at_20%_0%,hsl(var(--primary)/0.14),transparent_55%)]" />
                <CardHeader className="relative">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/15">
                      <f.icon className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-lg leading-tight">{f.title}</CardTitle>
                      <CardDescription>{f.desc}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative pt-0">
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,hsl(var(--primary)/0.22),transparent_55%),linear-gradient(to_bottom,hsl(var(--foreground)/0.06),transparent_35%)] pointer-events-none" />
        <div className="absolute inset-0 bg-noise opacity-25 mix-blend-soft-light pointer-events-none" />
        <div className="container mx-auto px-4 md:px-6 relative z-10 text-center space-y-4">
          <h3 className="text-3xl md:text-4xl font-headline font-bold text-foreground">
            Give every teacher a just-in-time AI companion
          </h3>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Reduce “lag time,” replace generic feedback with specific steps, and keep the spark of innovation alive in every class.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/teacher-companion">
              <Button
                size="lg"
                variant="outline"
                className="text-base bg-background/70 backdrop-blur border-border hover:bg-background shadow-lg shadow-primary/10"
              >
                Open Teacher Companion
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="lg" className="bg-primary text-white text-base shadow-lg shadow-primary/30 hover:bg-primary/90">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card/70 backdrop-blur py-12 border-t border-border relative z-10">
        <div className="container mx-auto px-4 md:px-6 text-center space-y-3">
          <h3 className="text-2xl font-bold font-headline text-foreground mb-2">Sarthi.AI</h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">Just-in-time, bilingual, offline-ready AI support for teachers in India’s government schools.</p>
          <div className="flex justify-center gap-6">
            <Link href="/login" className="text-sm font-medium text-foreground/80 hover:text-foreground hover:underline underline-offset-4">
              Login
            </Link>
            <Link href="/signup" className="text-sm font-medium text-foreground/80 hover:text-foreground hover:underline underline-offset-4">
              Sign Up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}