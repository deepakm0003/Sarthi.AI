'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useToast } from '@/hooks/use-toast';
import { generateSunitaModeAdvice, generateSnapshotAdvice, analyzeSnapshotImage, SunitaModeInput } from '@/ai/flows/teacher-companion';
import { useTranslation } from 'react-i18next';
import { ImageIcon, ArchiveRestore, HeartHandshake, UploadCloud, Mic, MicOff } from 'lucide-react';
import { LoadingSpinner } from '@/components/loading-spinner';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';

type Rating = 'confident' | 'neutral' | 'confused';

type HistoryItem = {
  id: string;
  type: 'sunita' | 'snapshot' | 'snapshot-image';
  inputSummary: string;
  output: string;
  timestamp: number;
  rating?: Rating;
};

const sunitaSchema = z.object({
  classLevel: z.enum(['3', '4', '5']),
  subject: z.enum(['Math', 'Hindi', 'EVS']),
  problemType: z.enum(['concept_confusion', 'classroom_chaos', 'mixed_ability', 'behavioral_issue']),
  language: z.enum(['English', 'Hindi']).default('English'),
  contextNote: z.string().optional(),
});

const snapshotSchema = z.object({
  language: z.enum(['English', 'Hindi']).default('English'),
  description: z.string().min(10, 'Please describe at least 10 characters.'),
});

const snapshotImageFormSchema = z.object({
  language: z.enum(['English', 'Hindi']).default('English'),
  description: z.string().optional(),
  imageFile: z
    .custom<FileList>(
      (value: unknown): value is FileList => value instanceof FileList && value.length === 1,
      'Please upload one image.'
    ),
});

function usePersistentHistory(key: string) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        setItems(JSON.parse(raw));
      }
    } catch {
      // ignore
    }
  }, [key]);

  const update = (next: HistoryItem[]) => {
    setItems(next);
    localStorage.setItem(key, JSON.stringify(next.slice(0, 20)));
  };

  const add = (item: HistoryItem) => {
    update([item, ...items].slice(0, 20));
  };

  const rate = (id: string, rating: Rating) => {
    const next = items.map((it) => (it.id === id ? { ...it, rating } : it));
    update(next);
  };

  return { items, add, rate };
}

export default function TeacherCompanionPage() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const sunitaForm = useForm<SunitaModeInput>({
    resolver: zodResolver(sunitaSchema),
    defaultValues: {
      classLevel: '3',
      subject: 'Math',
      problemType: 'concept_confusion',
      language: 'English',
      contextNote: '',
    },
  });
  const snapshotForm = useForm<z.infer<typeof snapshotSchema>>({
    resolver: zodResolver(snapshotSchema),
    defaultValues: {
      language: 'English',
      description: '',
    },
  });
  const snapshotImageForm = useForm<z.infer<typeof snapshotImageFormSchema>>({
    resolver: zodResolver(snapshotImageFormSchema),
    defaultValues: {
      language: 'English',
      description: '',
    },
  });

  const { items, add, rate } = usePersistentHistory('sarthi-teacher-history');
  const [sunitaOutput, setSunitaOutput] = useState<string | null>(null);
  const [snapshotOutput, setSnapshotOutput] = useState<string | null>(null);
  const [snapshotImageOutput, setSnapshotImageOutput] = useState<Awaited<ReturnType<typeof analyzeSnapshotImage>> | null>(null);
  const [isSunitaLoading, setIsSunitaLoading] = useState(false);
  const [isSnapshotLoading, setIsSnapshotLoading] = useState(false);
  const [isSnapshotImageLoading, setIsSnapshotImageLoading] = useState(false);
  const [snapshotImagePreview, setSnapshotImagePreview] = useState<string | null>(null);

  const langToBcp47 = (lang: 'English' | 'Hindi'): string => (lang === 'Hindi' ? 'hi-IN' : 'en-IN');

  const snapshotImageVoice = useSpeechRecognition((finalText: string) => {
    const current = snapshotImageForm.getValues('description') ?? '';
    const next = current.trim().length === 0 ? finalText : `${current.trim()} ${finalText}`;
    snapshotImageForm.setValue('description', next, { shouldDirty: true, shouldTouch: true });
  });

  const handleSunitaSubmit = async (values: SunitaModeInput) => {
    setIsSunitaLoading(true);
    setSunitaOutput(null);
    try {
      const res = await generateSunitaModeAdvice(values);
      const compiled = [
        `**${res.headline}**`,
        res.quickRead,
        '',
        `Steps:`,
        ...res.justInTimeSteps.map((s) => `- ${s}`),
        res.groupingPlan ? ['', 'Grouping:', ...res.groupingPlan.map((s) => `- ${s}`)] : [],
        res.activityTweak ? ['', `Activity tweak: ${res.activityTweak}`] : [],
        res.followUp ? ['', 'Follow-up:', ...res.followUp.map((s) => `- ${s}`)] : [],
      ]
        .flat()
        .filter(Boolean)
        .join('\n');

      setSunitaOutput(compiled);
      add({
        id: `sunita-${Date.now()}`,
        type: 'sunita',
        inputSummary: `${values.subject} • Class ${values.classLevel} • ${values.problemType}`,
        output: compiled,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to generate advice.',
      });
    } finally {
      setIsSunitaLoading(false);
    }
  };

  const handleSnapshotImageSubmit = async (values: z.infer<typeof snapshotImageFormSchema>) => {
    setIsSnapshotImageLoading(true);
    setSnapshotImageOutput(null);
    try {
      const file = values.imageFile?.[0];
      if (!file) throw new Error('No image selected.');
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

      setSnapshotImagePreview(base64);

      const res = await analyzeSnapshotImage({
        language: values.language,
        description: values.description,
        imageData: base64,
      });

      setSnapshotImageOutput(res);
      add({
        id: `snapshot-image-${Date.now()}`,
        type: 'snapshot-image',
        inputSummary: values.description?.slice(0, 80) ?? 'Classroom photo',
        output: res.summary,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to analyze image.',
      });
    } finally {
      setIsSnapshotImageLoading(false);
    }
  };

  const handleSnapshotSubmit = async (values: z.infer<typeof snapshotSchema>) => {
    setIsSnapshotLoading(true);
    setSnapshotOutput(null);
    try {
      const res = await generateSnapshotAdvice(values);
      const compiled = [
        res.strategy,
        '',
        'Grouping:',
        ...res.grouping.map((g) => `- ${g}`),
        '',
        `Activity tweak: ${res.activityTweak}`,
        '',
        'Follow-up check:',
        ...res.followUpCheck.map((f) => `- ${f}`),
      ].join('\n');
      setSnapshotOutput(compiled);
      add({
        id: `snapshot-${Date.now()}`,
        type: 'snapshot',
        inputSummary: values.description.slice(0, 80),
        output: compiled,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to generate advice.',
      });
    } finally {
      setIsSnapshotLoading(false);
    }
  };

  const rateHandler = (id: string, rating: Rating) => {
    rate(id, rating);
    toast({
      title: 'Feedback saved',
      description: 'Thanks for sharing your confidence level.',
    });
  };

  const latestItem = useMemo(() => items[0], [items]);

  return (
    <div className="page-shell">
      <header className="flex items-center justify-between p-4 md:p-6 lg:p-8 pb-2 md:pb-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Coach</p>
          <h1 className="font-headline text-2xl md:text-3xl font-bold text-foreground">Teacher Companion</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Offline-friendly guidance for Sunita-style scenarios and classroom snapshots. Designed for Math/Hindi/EVS in Classes 3–5.
          </p>
        </div>
        <SidebarTrigger className="md:hidden" />
      </header>

      <section className="px-4 md:px-6 pb-6">
        <Card className="section-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <HeartHandshake className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="font-headline text-xl">Recent guidance (offline cache)</CardTitle>
                <CardDescription>Last 20 responses are stored locally for weak internet.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.length === 0 && (
              <p className="text-sm text-muted-foreground">No cached responses yet. Generate advice to see it here.</p>
            )}
            {items.map((item) => (
              <Card key={item.id} className="border bg-card/80 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">
                      {item.type === 'sunita' ? 'Sunita Mode' : 'Snapshot'} • {new Date(item.timestamp).toLocaleTimeString()}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{item.inputSummary}</p>
                  </div>
                </CardHeader>
                <CardContent className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                  {item.output}
                </CardContent>
                <CardFooter className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Confidence meter:</span>
                  <Button variant="outline" size="sm" onClick={() => rateHandler(item.id, 'confident')}>
                    Confident
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => rateHandler(item.id, 'neutral')}>
                    Neutral
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => rateHandler(item.id, 'confused')}>
                    Still confused
                  </Button>
                  {item.rating && <span className="ml-2 text-foreground">Saved: {item.rating}</span>}
                </CardFooter>
              </Card>
            ))}
          </CardContent>
        </Card>

        <Card className="section-card mt-4">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="font-headline text-xl">Image Snapshot Analysis</CardTitle>
                <CardDescription>Upload a board/activity photo; get quick strategy and grouping.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Form {...snapshotImageForm}>
              <form onSubmit={snapshotImageForm.handleSubmit(handleSnapshotImageSubmit)} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField
                    control={snapshotImageForm.control}
                    name="language"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Language</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Language" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="English">English</SelectItem>
                            <SelectItem value="Hindi">Hindi</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={snapshotImageForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center justify-between gap-3">
                        <span>Context (optional)</span>
                        <div className="flex items-center gap-2">
                          {snapshotImageVoice.state.error && (
                            <span className="text-xs text-destructive">{snapshotImageVoice.state.error}</span>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!snapshotImageVoice.state.isSupported}
                            onClick={() => {
                              if (snapshotImageVoice.state.isListening) {
                                snapshotImageVoice.stop();
                                return;
                              }
                              const lang = snapshotImageForm.getValues('language');
                              snapshotImageVoice.start({ lang: langToBcp47(lang) });
                            }}
                          >
                            {snapshotImageVoice.state.isListening ? (
                              <>
                                <MicOff className="h-4 w-4 mr-2" />
                                Stop
                              </>
                            ) : (
                              <>
                                <Mic className="h-4 w-4 mr-2" />
                                Speak
                              </>
                            )}
                          </Button>
                        </div>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., Only 10 students engaged; back benchers chatting; fractions activity ongoing."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={snapshotImageForm.control}
                  name="imageFile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Upload classroom photo (board/activity)</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-card/70 p-3">
                          <UploadCloud className="h-5 w-5 text-primary" />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => field.onChange(e.target.files ?? undefined)}
                            className="text-sm"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isSnapshotImageLoading} className="w-full md:w-auto">
                  {isSnapshotImageLoading ? <LoadingSpinner className="mr-2 h-4 w-4" /> : null}
                  Analyze photo
                </Button>
              </form>
            </Form>

            {snapshotImagePreview && (
              <div className="rounded-lg border bg-card/80 p-3">
                <p className="text-sm font-semibold mb-2">Preview</p>
                <img src={snapshotImagePreview} alt="Snapshot preview" className="rounded-md max-h-[320px] object-contain border border-border/60" />
              </div>
            )}

            {snapshotImageOutput && (
              <Card className="section-card">
                <CardHeader>
                  <CardTitle className="text-lg">Analysis</CardTitle>
                  <CardDescription>{snapshotImageOutput.summary}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold mb-2">Engagement</p>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${snapshotImageOutput.engagementScore}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{snapshotImageOutput.engagementScore}% estimated engagement</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Focus areas</p>
                    {snapshotImageOutput.focusAreas.map((f) => (
                      <div key={f.label} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{f.label}</span>
                          <span className="text-muted-foreground text-xs">{f.score}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-2 rounded-full bg-foreground/60"
                            style={{ width: `${f.score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1">Grouping</p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {snapshotImageOutput.grouping.map((g) => <li key={g}>{g}</li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1">Strategies (next 10 min)</p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {snapshotImageOutput.strategies.map((s) => <li key={s}>{s}</li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1">Activity tweak</p>
                    <p className="text-sm text-muted-foreground">{snapshotImageOutput.activityTweak}</p>
                  </div>
                </CardContent>
                {latestItem?.id && latestItem.type === 'snapshot-image' && (
                  <CardFooter className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Confidence meter:</span>
                    <Button variant="outline" size="sm" onClick={() => rateHandler(latestItem.id, 'confident')}>
                      Confident
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => rateHandler(latestItem.id, 'neutral')}>
                      Neutral
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => rateHandler(latestItem.id, 'confused')}>
                      Still confused
                    </Button>
                  </CardFooter>
                )}
              </Card>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
