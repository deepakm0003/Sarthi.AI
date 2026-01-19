'use client';

import { useAuth } from '@/hooks/use-auth';
import { GradeUploadForm } from '@/components/grades/grade-upload-form';
import { StudentGradesTable } from '@/components/grades/student-grades-table';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Card, CardContent } from '@/components/ui/card';

export default function GradesPage() {
    const { profile, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center app-surface">
                <div className="soft-card px-6 py-5 flex items-center gap-3 shadow-lg shadow-black/5">
                    <LoadingSpinner className="h-5 w-5 text-primary" />
                    <div>
                        <p className="text-sm font-semibold text-foreground">Loading grades</p>
                        <p className="text-xs text-muted-foreground">Preparing performance data...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-shell">
            <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-6">
                <div className="flex flex-col gap-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Performance</p>
                    <h1 className="text-3xl md:text-4xl font-headline font-bold text-foreground">Grades &amp; Progress</h1>
                    <p className="text-muted-foreground max-w-2xl">
                        {profile?.role === 'teacher'
                            ? 'Upload marks, track class performance, and share feedback.'
                            : 'See your scores and growth over time.'}
                    </p>
                </div>

                <Card className="section-card">
                    <CardContent className="p-4 md:p-6">
                        {profile?.role === 'teacher' ? (
                            <GradeUploadForm />
                        ) : (
                            <StudentGradesTable />
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
