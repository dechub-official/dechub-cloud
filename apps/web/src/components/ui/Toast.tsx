'use client';

import { createContext, useCallback, useContext, useState } from 'react';

type Tone = 'success' | 'error' | 'info';
const Ctx = createContext<(message: string, tone?: Tone) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<{ id: number; message: string; tone: Tone }[]>([]);
  const push = useCallback((message: string, tone: Tone = 'success') => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, message, tone }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 4200);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2" aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-lg px-4 py-2.5 text-[13px] font-medium shadow-lift ${
              t.tone === 'error' ? 'bg-rose text-white' : t.tone === 'info' ? 'bg-aubergine text-white' : 'bg-aubergine text-white'
            }`}
          >
            {t.tone === 'success' && <span className="mr-2 text-brass-light">●</span>}
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
