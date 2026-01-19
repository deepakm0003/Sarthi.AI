import { LoadingSpinner } from '@/components/loading-spinner';
import Image from 'next/image';

export default function Loading() {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center app-surface">
      <div className="soft-card px-6 py-5 flex items-center gap-4 shadow-lg shadow-black/5">
        <div className="relative">
          <div className="absolute -inset-2 rounded-full bg-primary/10 blur-md" />
          <Image
            src="/assets/logo-sarthi.svg"
            alt="Sarthi.AI"
            width={36}
            height={36}
            className="relative rounded-md bg-white/90 p-1"
            priority
          />
        </div>
        <div className="flex flex-col">
          <div className="text-sm font-semibold text-foreground">Loading your workspace</div>
          <div className="text-xs text-muted-foreground">Preparing tools for planning, classrooms, and assessments.</div>
        </div>
        <LoadingSpinner className="ml-2 h-6 w-6 text-primary" />
      </div>
    </div>
  );
}
