"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { generateDifferentiatedWorksheets, GenerateDifferentiatedWorksheetsOutput } from '@/ai/flows/generate-differentiated-worksheets';
import { LoadingSpinner } from '@/components/loading-spinner';
import { SidebarTrigger } from '@/components/ui/sidebar';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Download, Share2, UploadCloud, Sparkles, FileSpreadsheet, X, GraduationCap } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Textarea } from '@/components/ui/textarea';
import PageSkeleton from '@/components/skeletons/PageSkeleton';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';


const worksheetsSchema = z.object({
  textbookPageImage: z.string().min(1, 'Please upload an image.'),
  gradeLevels: z.string().min(1, 'Please enter grade levels.').regex(/^\d+(,\s*\d+)*$/, 'Please enter comma-separated numbers (e.g., 3, 4, 5)'),
  additionalDetails: z.string().optional(),
});

type Worksheet = GenerateDifferentiatedWorksheetsOutput['worksheets'][0];

export default function DifferentiatedWorksheetsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [selectedWorksheet, setSelectedWorksheet] = useState<Worksheet | null>(null);
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, profile, loading: authLoading, classrooms } = useAuth();
  const router = useRouter();
  const contentRefs = useRef<(HTMLDivElement | null)[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (!authLoading && profile && profile.role !== 'teacher') {
        router.replace('/profile');
    }
  }, [authLoading, profile, router]);

  const form = useForm<z.infer<typeof worksheetsSchema>>({
    resolver: zodResolver(worksheetsSchema),
    defaultValues: {
      textbookPageImage: '',
      gradeLevels: '',
      additionalDetails: '',
    },
  });

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });

  async function handleFileSelect(file: File | null) {
    if (!file || !file.type.startsWith('image/')) return;
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    const base64 = await toBase64(file);
    form.setValue('textbookPageImage', base64, { shouldValidate: true });
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void handleFileSelect(file);
    event.target.value = '';
  }

  function handleClearImage() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    form.setValue('textbookPageImage', '', { shouldValidate: true });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.currentTarget.dataset.drag = 'false';
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) void handleFileSelect(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.currentTarget.dataset.drag = 'true';
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.currentTarget.dataset.drag = 'false';
  }

  async function onSubmit(values: z.infer<typeof worksheetsSchema>) {
    setIsLoading(true);
    setWorksheets([]);
    contentRefs.current = [];
    try {
      const result = await generateDifferentiatedWorksheets(values);
      setWorksheets(result.worksheets);
      contentRefs.current = result.worksheets.map(() => null);
    } catch (error) {
      console.error('Error generating worksheets:', error);
      toast({
        variant: 'destructive',
        title: t('error'),
        description: t('failedGenerateWorksheets'),
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  const handleExportToPdf = (index: number) => {
    const input = contentRefs.current[index];
    const gradeLevel = worksheets[index].gradeLevel;
    if (!input) {
      toast({ variant: 'destructive', title: t('error'), description: t('pdfContentNotFound') });
      return;
    }
    setIsPdfLoading(gradeLevel);
    html2canvas(input, { scale: 2, useCORS: true })
      .then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(imgData);
        const ratio = Math.min(pdfWidth / imgProps.width, pdfHeight / imgProps.height);
        pdf.addImage(imgData, 'PNG', 0, 0, imgProps.width * ratio, imgProps.height * ratio);
        pdf.save(`${t('worksheetFileName')}-grade-${gradeLevel}.pdf`);
      })
      .catch((error) => {
        console.error('Error generating PDF:', error);
        toast({ variant: 'destructive', title: t('pdfError'), description: t('failedExportPdf') });
      })
      .finally(() => setIsPdfLoading(null));
  };
  
  const handleShare = async () => {
    if (!user || !profile || !selectedClassroom || !selectedWorksheet) return;

    setIsSharing(true);
    try {
      const worksheetData = {
        authorId: user.uid,
        authorName: profile.name,
        createdAt: serverTimestamp(),
        gradeLevel: selectedWorksheet.gradeLevel,
        worksheetContent: selectedWorksheet.worksheetContent,
      };
      const worksheetRef = await addDoc(collection(db!, 'worksheets'), worksheetData);

      const postData = {
        authorId: user.uid,
        authorName: profile.name,
        createdAt: serverTimestamp(),
        type: 'worksheet',
        worksheetId: worksheetRef.id,
        gradeLevel: selectedWorksheet.gradeLevel,
      };
      await addDoc(collection(db!, 'classrooms', selectedClassroom, 'posts'), postData);
      
      const classroom = classrooms.find(c => c.id === selectedClassroom);
      toast({ title: t('success'), description: t('worksheetShared', { grade: classroom?.grade, section: classroom?.section }) });
      setIsShareDialogOpen(false);
      setSelectedWorksheet(null);
      setSelectedClassroom('');
    } catch (error) {
      console.error("Error sharing worksheet:", error);
      toast({ variant: 'destructive', title: t('error'), description: t('couldNotShareWorksheet') });
    } finally {
      setIsSharing(false);
    }
  };

  if (authLoading || !profile || profile.role !== 'teacher') {
    return (
      <PageSkeleton>
        <LoadingSpinner className="h-12 w-12" />
      </PageSkeleton>
    );
  }

  return (
    <div className="page-shell flex flex-col h-full">
      <header className="flex items-center justify-between p-4 md:p-6 lg:p-8 pb-2 md:pb-4 md:border-none border-b border-border">
        <div className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("Worksheets")}</p>
          <h1 className="font-headline text-2xl md:text-3xl font-bold text-foreground">
            {t("Differentiated Worksheets Generator")}
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            {t("Upload a textbook page to create worksheets for different grade levels.")}
          </p>
        </div>
        <SidebarTrigger className="md:hidden shrink-0" />
      </header>

      <div className="flex-1 px-4 md:px-6 lg:px-8 pb-8 overflow-auto">
        <Card className="section-card max-w-3xl mx-auto">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="font-headline text-xl">{t("Create worksheets")}</CardTitle>
                <CardDescription>
                  {t("Upload a textbook page to create worksheets for different grade levels.")}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="textbookPageImage"
                  render={({ fieldState }) => (
                    <FormItem>
                      <FormLabel>{t("Textbook Page Image")}</FormLabel>
                      <FormControl>
                        <div className="block">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="sr-only"
                            aria-label={t("Textbook page image")}
                          />
                          {preview ? (
                            <div className="relative rounded-xl border border-border bg-muted/40 overflow-hidden group">
                              <div className="aspect-[4/3] max-h-[280px] w-full relative">
                                <Image
                                  src={preview}
                                  alt={t("Textbook page preview")}
                                  fill
                                  className="object-contain p-2"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                  >
                                    <UploadCloud className="h-4 w-4 mr-2" />
                                    {t("Change")}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleClearImage}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <X className="h-4 w-4 mr-2" />
                                    {t("Remove")}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => fileInputRef.current?.click()}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  fileInputRef.current?.click();
                                }
                              }}
                              onDrop={handleDrop}
                              onDragOver={handleDragOver}
                              onDragLeave={handleDragLeave}
                              data-drag="false"
                              className={cn(
                                "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/30 py-12 px-6 transition-all cursor-pointer",
                                "hover:border-primary/50 hover:bg-primary/5",
                                "data-[drag=true]:border-primary data-[drag=true]:bg-primary/10",
                                fieldState.invalid && "border-destructive/50"
                              )}
                            >
                              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                                <UploadCloud className="h-7 w-7 text-primary" />
                              </div>
                              <div className="text-center space-y-1">
                                <p className="text-sm font-medium text-foreground">
                                  {t("Drop your textbook page here")}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {t("or click to browse")} · PNG, JPG, WebP
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="gradeLevels"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-primary" />
                          {t("Grade Levels")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("e.g., 3, 4, 5")}
                            className="h-11"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground">
                          {t("Comma-separated: 3, 4, 5")}
                        </p>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="additionalDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("Additional Details (Optional)")}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t("e.g., Create mostly fill-in-the-blank questions based on the text.")}
                          rows={4}
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={isLoading}
                  size="lg"
                  className="w-full md:w-auto min-w-[200px] h-12 text-base shadow-lg shadow-primary/20"
                >
                  {isLoading ? (
                    <LoadingSpinner className="mr-2 h-4 w-4" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  {t("Generate Worksheets")}
                </Button>
              </form>
            </Form>
          </CardContent>

          {worksheets.length > 0 && (
            <CardFooter className="pt-0 flex-col items-stretch gap-4">
              <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />
              <Card className="section-card w-full">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="font-headline text-lg">{t("Generated Worksheets")}</CardTitle>
                      <CardDescription>
                        {t("Grade Level")} · {worksheets.map((w) => w.gradeLevel).join(", ")}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full space-y-2">
                    {worksheets.map((ws, index) => (
                      <AccordionItem
                        value={`item-${index}`}
                        key={index}
                        className="border rounded-lg px-4 data-[state=open]:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center w-full gap-2">
                          <AccordionTrigger className="flex-1 hover:no-underline py-4 [&>svg]:shrink-0">
                            <span className="inline-flex items-center gap-2">
                              <span className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary text-sm font-semibold">
                                {ws.gradeLevel}
                              </span>
                              {t("Grade")} {ws.gradeLevel}
                            </span>
                          </AccordionTrigger>
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleExportToPdf(index)}
                              disabled={isPdfLoading !== null}
                              aria-label={t("Download PDF for Grade {{grade}}", { grade: ws.gradeLevel })}
                              className="shrink-0"
                            >
                              {isPdfLoading === ws.gradeLevel ? (
                                <LoadingSpinner className="mr-2 h-4 w-4" />
                              ) : (
                                <Download className="mr-2 h-4 w-4" />
                              )}
                              {t("PDF")}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedWorksheet(ws);
                                setIsShareDialogOpen(true);
                              }}
                              disabled={classrooms.length === 0}
                              aria-label={t("Share worksheet for Grade {{grade}}", { grade: ws.gradeLevel })}
                              className="shrink-0"
                            >
                              <Share2 className="mr-2 h-4 w-4" />
                              {t("Share")}
                            </Button>
                          </div>
                        </div>
                        <AccordionContent className="pb-4">
                          <div
                            ref={(el) => {
                              contentRefs.current[index] = el;
                            }}
                            className="p-5 rounded-lg border border-border bg-background/80"
                          >
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {ws.worksheetContent}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </CardFooter>
          )}
        </Card>

        <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("Share Worksheet")}</DialogTitle>
              <DialogDescription>
                {t("Select a classroom to post this worksheet to their feed.")}
                {classrooms.length === 0 && (
                  <span className="text-destructive block mt-2">{t("You have not joined any classrooms.")}</span>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Select value={selectedClassroom} onValueChange={setSelectedClassroom}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={t("Select a classroom...")} />
                </SelectTrigger>
                <SelectContent>
                  {classrooms.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {t("Grade")} {c.grade} — {t("Section")} {c.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsShareDialogOpen(false)}>
                {t("Cancel")}
              </Button>
              <Button onClick={handleShare} disabled={!selectedClassroom || isSharing}>
                {isSharing && <LoadingSpinner className="mr-2 h-4 w-4" />}
                {t("Share")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
