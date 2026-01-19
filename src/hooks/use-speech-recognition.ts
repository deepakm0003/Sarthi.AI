import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type SpeechRecognitionCtor = new () => SpeechRecognition;

type UseSpeechRecognitionOptions = {
  lang: string;
  interimResults?: boolean;
  continuous?: boolean;
};

type UseSpeechRecognitionState = {
  isSupported: boolean;
  isListening: boolean;
  error: string | null;
};

type UseSpeechRecognitionApi = {
  state: UseSpeechRecognitionState;
  start: (opts: UseSpeechRecognitionOptions) => void;
  stop: () => void;
};

function getSpeechRecognitionCtor(win: Window): SpeechRecognitionCtor | null {
  const w = win as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function errToMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Voice input failed. Please try again.';
}

export function useSpeechRecognition(onFinalText: (text: string) => void): UseSpeechRecognitionApi {
  const ctor = useMemo<SpeechRecognitionCtor | null>(() => {
    if (typeof window === 'undefined') return null;
    return getSpeechRecognitionCtor(window);
  }, []);

  const recRef = useRef<SpeechRecognition | null>(null);
  const onFinalTextRef = useRef<(text: string) => void>(onFinalText);
  onFinalTextRef.current = onFinalText;

  const [isListening, setIsListening] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback((): void => {
    try {
      recRef.current?.stop();
    } catch {
      // ignore
    } finally {
      setIsListening(false);
    }
  }, []);

  const start = useCallback(
    (opts: UseSpeechRecognitionOptions): void => {
      setError(null);
      if (!ctor) {
        setError('Voice input is not supported in this browser.');
        return;
      }

      // Restart cleanly
      if (recRef.current) {
        try {
          recRef.current.onresult = null;
          recRef.current.onerror = null;
          recRef.current.onend = null;
          recRef.current.stop();
        } catch {
          // ignore
        }
        recRef.current = null;
      }

      const rec = new ctor();
      recRef.current = rec;

      rec.lang = opts.lang;
      rec.interimResults = opts.interimResults ?? true;
      rec.continuous = opts.continuous ?? false;

      rec.onresult = (event: SpeechRecognitionEvent) => {
        // Emit only finalized chunks to avoid flicker.
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const res = event.results[i];
          if (!res.isFinal) continue;
          const text = res[0]?.transcript?.trim();
          if (text) onFinalTextRef.current(text);
        }
      };

      rec.onerror = (ev: SpeechRecognitionErrorEvent) => {
        setError(ev.error ? `Voice input error: ${ev.error}` : 'Voice input error.');
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      try {
        rec.start();
        setIsListening(true);
      } catch (err: unknown) {
        setError(errToMessage(err));
        setIsListening(false);
      }
    },
    [ctor]
  );

  useEffect(() => {
    return () => {
      try {
        recRef.current?.stop();
      } catch {
        // ignore
      }
    };
  }, []);

  return {
    state: { isSupported: Boolean(ctor), isListening, error },
    start,
    stop,
  };
}

