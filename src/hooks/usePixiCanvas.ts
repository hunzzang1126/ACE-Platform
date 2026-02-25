// ─────────────────────────────────────────────────
// usePixiCanvas – PixiJS 캔버스 마운트/언마운트 훅
// ─────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react';
import { PixiRenderer } from '@/engine/PixiRenderer';

/**
 * PixiJS Application을 DOM에 마운트하는 훅.
 * 컴포넌트 언마운트 시 GPU 리소스 자동 정리.
 * `ready` 상태를 노출하여 다른 훅이 초기화 완료 후 동작하도록 보장.
 */
export function usePixiCanvas() {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<PixiRenderer | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let cancelled = false;
        const renderer = new PixiRenderer();
        rendererRef.current = renderer;

        renderer.init(container).then(() => {
            if (!cancelled) setReady(true);
        }).catch(console.error);

        return () => {
            cancelled = true;
            setReady(false);
            renderer.destroy();
            rendererRef.current = null;
        };
    }, []);

    return { containerRef, rendererRef, ready };
}
