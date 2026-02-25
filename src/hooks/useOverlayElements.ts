// ─────────────────────────────────────────────────
// useOverlayElements — Manages text, image & video overlays on the canvas
// These are HTML elements positioned over the WebGPU canvas
// ─────────────────────────────────────────────────
import { useState, useCallback, useRef } from 'react';

export interface OverlayElement {
    id: string;
    type: 'text' | 'image' | 'video';
    name: string;           // editable layer name
    x: number;
    y: number;
    w: number;
    h: number;
    // Text-specific
    content?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    color?: string;
    textAlign?: 'left' | 'center' | 'right';
    lineHeight?: number;    // e.g. 1.4
    letterSpacing?: number; // px
    // Image-specific
    src?: string;        // data URL or object URL
    fileName?: string;
    objectFit?: 'cover' | 'contain' | 'fill';
    // Video-specific
    videoSrc?: string;   // object URL for video
    muted?: boolean;
    loop?: boolean;
    autoplay?: boolean;
    posterSrc?: string;  // thumbnail data URL from first frame
    // Common
    opacity: number;
    zIndex: number;
    editing?: boolean;   // true when text is being inline-edited
    locked?: boolean;    // can't select/move
    visible?: boolean;   // hide layer
}

let _overlayIdCounter = 0;
function nextOverlayId(): string {
    return `ov-${++_overlayIdCounter}`;
}

export function useOverlayElements(canvasWidth = 300, canvasHeight = 250) {
    const [elements, setElements] = useState<OverlayElement[]>([]);
    const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // ── Add text ──
    const addText = useCallback((x: number, y: number) => {
        const id = nextOverlayId();
        const newEl: OverlayElement = {
            id,
            type: 'text',
            name: `Text ${_overlayIdCounter}`,
            x,
            y,
            w: 200,
            h: 40,
            content: 'Double-click to edit',
            fontSize: 16,
            fontFamily: 'Inter, sans-serif',
            fontWeight: '400',
            color: '#ffffff',
            textAlign: 'left',
            lineHeight: 1.4,
            letterSpacing: 0,
            opacity: 1,
            zIndex: _overlayIdCounter,
            editing: false,
            locked: false,
            visible: true,
        };
        setElements((prev) => [...prev, newEl]);
        setSelectedOverlayId(id);
        return id;
    }, []);

    // ── Add image (from file) ──
    // Scales to fit 80% of canvas (preserving aspect ratio), no arbitrary cap
    const addImage = useCallback((x: number, y: number, file: File) => {
        const id = nextOverlayId();
        const reader = new FileReader();
        reader.onload = (evt) => {
            const src = evt.target?.result as string;
            const img = new Image();
            img.onload = () => {
                // Scale to fit 80% of canvas, preserving aspect ratio
                const maxW = canvasWidth * 0.8;
                const maxH = canvasHeight * 0.8;
                const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
                const w = Math.round(img.width * ratio);
                const h = Math.round(img.height * ratio);
                const newEl: OverlayElement = {
                    id,
                    type: 'image',
                    name: file.name.replace(/\.[^.]+$/, '') || `Image ${_overlayIdCounter}`,
                    x,
                    y,
                    w,
                    h,
                    src,
                    fileName: file.name,
                    objectFit: 'cover',
                    opacity: 1,
                    zIndex: _overlayIdCounter,
                    locked: false,
                    visible: true,
                };
                setElements((prev) => [...prev, newEl]);
                setSelectedOverlayId(id);
            };
            img.src = src;
        };
        reader.readAsDataURL(file);
        return id;
    }, [canvasWidth, canvasHeight]);

    // ── Trigger file input for image ──
    // Accepts optional (x, y); if omitted, centers on canvas
    const triggerImageUpload = useCallback((x?: number, y?: number) => {
        const cx = x ?? Math.round(canvasWidth * 0.1);
        const cy = y ?? Math.round(canvasHeight * 0.1);
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                addImage(cx, cy, file);
            }
            document.body.removeChild(input);
        };
        document.body.appendChild(input);
        input.click();
        fileInputRef.current = input;
    }, [addImage, canvasWidth, canvasHeight]);

    // ── Add video (from file) ──
    // Scales to fit 80% of canvas (preserving aspect ratio), no arbitrary cap
    const addVideo = useCallback((x: number, y: number, file: File) => {
        const id = nextOverlayId();
        const objectUrl = URL.createObjectURL(file);

        // Create a temporary video element to get dimensions and generate poster
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.onloadedmetadata = () => {
            // Scale to fit 80% of canvas, preserving aspect ratio
            const maxW = canvasWidth * 0.8;
            const maxH = canvasHeight * 0.8;
            const ratio = Math.min(maxW / video.videoWidth, maxH / video.videoHeight, 1);
            const w = Math.round(video.videoWidth * ratio);
            const h = Math.round(video.videoHeight * ratio);

            // Seek to first frame for poster
            video.currentTime = 0.1;
            video.onseeked = () => {
                // Generate poster from first frame
                let posterSrc: string | undefined;
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(video, 0, 0);
                        posterSrc = canvas.toDataURL('image/jpeg', 0.7);
                    }
                } catch { /* CORS or other error — skip poster */ }

                const newEl: OverlayElement = {
                    id,
                    type: 'video',
                    name: file.name.replace(/\.[^.]+$/, '') || `Video ${_overlayIdCounter}`,
                    x,
                    y,
                    w,
                    h,
                    videoSrc: objectUrl,
                    fileName: file.name,
                    posterSrc,
                    objectFit: 'cover',
                    muted: true,
                    loop: true,
                    autoplay: true,
                    opacity: 1,
                    zIndex: _overlayIdCounter,
                    locked: false,
                    visible: true,
                };
                setElements((prev) => [...prev, newEl]);
                setSelectedOverlayId(id);
            };
        };
        video.src = objectUrl;
        return id;
    }, [canvasWidth, canvasHeight]);

    // ── Trigger file input for video ──
    // Accepts optional (x, y); if omitted, centers on canvas
    const triggerVideoUpload = useCallback((x?: number, y?: number) => {
        const cx = x ?? Math.round(canvasWidth * 0.1);
        const cy = y ?? Math.round(canvasHeight * 0.1);
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*';
        input.style.display = 'none';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                addVideo(cx, cy, file);
            }
            document.body.removeChild(input);
        };
        document.body.appendChild(input);
        input.click();
    }, [addVideo, canvasWidth, canvasHeight]);

    // ── Update element ──
    const updateElement = useCallback((id: string, updates: Partial<OverlayElement>) => {
        setElements((prev) =>
            prev.map((el) => (el.id === id ? { ...el, ...updates } : el))
        );
    }, []);

    // ── Delete element ──
    const deleteElement = useCallback((id: string) => {
        setElements((prev) => prev.filter((el) => el.id !== id));
        setSelectedOverlayId((prev) => (prev === id ? null : prev));
    }, []);

    // ── Select overlay element ──
    const selectOverlay = useCallback((id: string | null) => {
        setSelectedOverlayId(id);
    }, []);

    // ── Reorder: move up (higher z-index) ──
    const moveUp = useCallback((id: string) => {
        setElements((prev) => {
            const idx = prev.findIndex(e => e.id === id);
            if (idx < 0 || idx >= prev.length - 1) return prev;
            const arr = [...prev];
            const temp = arr[idx]!;
            arr[idx] = arr[idx + 1]!;
            arr[idx + 1] = temp;
            return arr.map((el, i) => ({ ...el, zIndex: i }));
        });
    }, []);

    // ── Reorder: move down (lower z-index) ──
    const moveDown = useCallback((id: string) => {
        setElements((prev) => {
            const idx = prev.findIndex(e => e.id === id);
            if (idx <= 0) return prev;
            const arr = [...prev];
            const temp = arr[idx]!;
            arr[idx] = arr[idx - 1]!;
            arr[idx - 1] = temp;
            return arr.map((el, i) => ({ ...el, zIndex: i }));
        });
    }, []);

    // ── Reorder: drag to specific position ──
    const reorderTo = useCallback((sourceId: string, targetIndex: number) => {
        setElements((prev) => {
            const srcIdx = prev.findIndex(e => e.id === sourceId);
            if (srcIdx < 0 || srcIdx === targetIndex) return prev;
            const arr = [...prev];
            const [moved] = arr.splice(srcIdx, 1);
            if (!moved) return prev;
            arr.splice(targetIndex, 0, moved);
            return arr.map((el, i) => ({ ...el, zIndex: i }));
        });
    }, []);

    // ── Toggle lock ──
    const toggleLock = useCallback((id: string) => {
        setElements((prev) =>
            prev.map(el => el.id === id ? { ...el, locked: !el.locked } : el)
        );
    }, []);

    // ── Toggle visibility ──
    const toggleVisibility = useCallback((id: string) => {
        setElements((prev) =>
            prev.map(el => el.id === id ? { ...el, visible: !(el.visible ?? true) } : el)
        );
    }, []);

    // ── Set z-index directly ──
    const setZIndex = useCallback((id: string, z: number) => {
        setElements((prev) =>
            prev.map(el => el.id === id ? { ...el, zIndex: z } : el)
        );
    }, []);

    // ── Duplicate ──
    const duplicateOverlay = useCallback((id: string) => {
        const el = elements.find(e => e.id === id);
        if (!el) return null;
        const newId = nextOverlayId();
        const clone: OverlayElement = {
            ...el,
            id: newId,
            name: `${el.name} copy`,
            x: el.x + 20,
            y: el.y + 20,
            zIndex: _overlayIdCounter,
            editing: false,
        };
        setElements((prev) => [...prev, clone]);
        setSelectedOverlayId(newId);
        return newId;
    }, [elements]);

    // ── Rename ──
    const renameOverlay = useCallback((id: string, name: string) => {
        setElements((prev) =>
            prev.map(el => el.id === id ? { ...el, name } : el)
        );
    }, []);

    // ── Restore from saved data ──
    const restoreElements = useCallback((savedOverlays: OverlayElement[]) => {
        if (savedOverlays.length === 0) return;
        // Replace, not append — this is initial load from saved data
        setElements(savedOverlays);
        console.log(`[useOverlayElements] Restored ${savedOverlays.length} overlay elements`);
    }, []);

    // ── Get selected element ──
    const selectedElement = elements.find((el) => el.id === selectedOverlayId) ?? null;

    return {
        overlayElements: elements,
        selectedOverlayId,
        selectedOverlayElement: selectedElement,
        addText,
        addImage,
        triggerImageUpload,
        addVideo,
        triggerVideoUpload,
        updateElement,
        deleteElement,
        selectOverlay,
        moveUp,
        moveDown,
        reorderTo,
        setZIndex,
        toggleLock,
        toggleVisibility,
        duplicateOverlay,
        renameOverlay,
        restoreElements,
    };
}

