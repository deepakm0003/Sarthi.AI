"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { generateVisualAid } from '@/ai/flows/generate-visual-aids';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Download, ImageOff, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import FeaturePageSkeleton from "@/components/skeletons/FeaturePageSkeleton";
import { useTranslation } from 'react-i18next';


const visualAidSchema = z.object({
  description: z.string().min(10, 'Please provide a more detailed description.'),
});

export default function VisualAidsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [visualAid, setVisualAid] = useState<string | null>(null);
  const { toast } = useToast();
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (!authLoading && profile && profile.role !== 'teacher') {
        router.replace('/profile');
    }
  }, [authLoading, profile, router]);

  const form = useForm<z.infer<typeof visualAidSchema>>({
    resolver: zodResolver(visualAidSchema),
    defaultValues: {
      description: '',
    },
  });

  async function onSubmit(values: z.infer<typeof visualAidSchema>) {
    setIsLoading(true);
    setVisualAid(null);
    try {
      const result = await generateVisualAid(values);
      setVisualAid(result.visualAidDataUri);
    } catch (error) {
      console.error('Error generating visual aid:', error);
      toast({
        variant: 'destructive',
        title: t('Error'),
        description: t('Failed to generate visual aid. Please try again.'),
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleExport = () => {
    if (!visualAid) {
      toast({
        variant: 'destructive',
        title: t('Error'),
        description: t('No visual aid to export.'),
      });
      return;
    }
    const link = document.createElement('a');
    link.href = visualAid;

    const mimeType = visualAid.match(/data:image\/([a-zA-Z+]+);/);
    const extension = mimeType ? mimeType[1] : 'png';
    link.download = `visual-aid.${extension}`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
        title: t('Success'),
        description: t('Visual aid has been downloaded.'),
    });
  };

  if (authLoading || !profile || profile.role !== 'teacher') {
    return <FeaturePageSkeleton cardCount={6} />; 
  }
        

  return (
    <div className="page-shell">
      <header className="flex items-center justify-between p-4 md:p-6 lg:p-8 pb-2 md:pb-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t('Visuals')}</p>
          <h1 className="font-headline text-2xl md:text-3xl font-bold text-foreground">{t('Visual Aids')}</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">{t('Generate chalkboard-ready diagrams and charts to explain concepts clearly.')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg border bg-card shadow-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">{t('AI-powered')}</span>
          </div>
          <SidebarTrigger className="md:hidden" />
        </div>
      </header>

      <div className="flex-1 p-4 md:p-8 overflow-auto">
        <Card className="max-w-5xl mx-auto section-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-headline text-2xl">{t('Visual Aid Generator')}</CardTitle>
            <CardDescription>{t('Describe a simple line drawing or chart to explain a concept.')}</CardDescription>
          </CardHeader>
          <CardContent className="pb-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Description')}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t('e.g., A simple diagram of the water cycle showing evaporation, condensation, and precipitation.')}
                          {...field}
                          rows={4}
                          className="min-h-[120px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
                  {isLoading ? <LoadingSpinner className="mr-2 h-4 w-4" /> : null}
                  {t('Generate Visual Aid')}
                </Button>
              </form>
            </Form>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            {isLoading && (
              <Skeleton className="w-full h-80 rounded-lg" />
            )}

            {visualAid && (
              <Card className="w-full bg-secondary/60 border border-border/70 shadow-sm">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="font-headline text-xl">{t('Generated Visual Aid')}</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleExport}
                      aria-label={t('Export Visual Aid')}
                    >
                      <Download className="h-5 w-5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex justify-center p-6 bg-background/60 rounded-b-lg">
                  <img
                    src={visualAid}
                    alt={t('Generated visual aid')}
                    className="rounded-md max-h-[520px] object-contain shadow-sm border border-border/60 bg-card"
                  />
                </CardContent>
              </Card>
            )}

            {!isLoading && !visualAid && (
              <div className="flex flex-col items-center gap-2 text-muted-foreground bg-secondary/40 border border-dashed border-border rounded-lg p-6">
                <ImageOff className="h-6 w-6" />
                <p className="text-sm text-center">{t('Describe a visual aid above to generate a chalkboard-ready SVG.')}</p>
              </div>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
