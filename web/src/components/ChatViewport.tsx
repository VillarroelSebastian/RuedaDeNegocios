"use client";
import { ReactNode, useEffect, useRef, useState } from 'react';

// Mobile browsers do not all resize dvh when the software keyboard opens.
export default function ChatViewport({ children, className, embedded = false }: { children: ReactNode; className: string; embedded?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const element = ref.current;
        if (!element) return;
        const viewport = window.visualViewport;
        const bottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
        const available = Math.max(120, bottom - element.getBoundingClientRect().top);
        setHeight(embedded ? Math.min(available, element.parentElement?.clientHeight || available) : available);
      });
    };
    measure();
    window.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('scroll', measure);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', measure); window.visualViewport?.removeEventListener('resize', measure); window.visualViewport?.removeEventListener('scroll', measure); };
  }, [embedded]);
  return <div ref={ref} className={className} style={{ height, paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))' }}>{children}</div>;
}
