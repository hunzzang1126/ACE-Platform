// ─────────────────────────────────────────────────
// SmartAssetUploader — Drag & drop + AI auto-analysis
// ─────────────────────────────────────────────────
// Upload images → Vision API → auto-tags, colors, description.
// Shows analysis results inline. Thin component per ACE rules.

import React, { useState, useCallback, useRef } from 'react';
import {
    analyzeAsset,
    type AssetLibraryItem,
    type AssetAnalysis,
} from '@/ai/services/assetAnalyzer';

interface SmartAssetUploaderProps {
    onAssetAnalyzed: (asset: AssetLibraryItem) => void;
}

let assetIdCounter = 0;

export const SmartAssetUploader: React.FC<SmartAssetUploaderProps> = ({
    onAssetAnalyzed,
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [lastResult, setLastResult] = useState<AssetAnalysis | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const processFile = useCallback(async (file: File) => {
        if (!file.type.startsWith('image/')) return;

        setAnalyzing(true);
        setLastResult(null);

        // Read file as data URL
        const dataUrl = await readFileAsDataUrl(file);
        const { width, height } = await getImageDimensions(dataUrl);

        const id = `asset_${++assetIdCounter}_${Date.now()}`;

        // Create pending asset
        const asset: AssetLibraryItem = {
            id,
            fileName: file.name,
            src: dataUrl,
            fileSize: file.size,
            width,
            height,
            status: 'analyzing',
            uploadedAt: new Date().toISOString(),
        };

        // Analyze with Vision API
        try {
            const analysis = await analyzeAsset(dataUrl, file.name, width, height);
            asset.analysis = analysis;
            asset.status = 'done';
            setLastResult(analysis);
        } catch {
            asset.status = 'error';
        }

        setAnalyzing(false);
        onAssetAnalyzed(asset);
    }, [onAssetAnalyzed]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    }, [processFile]);

    const handleClick = useCallback(() => {
        inputRef.current?.click();
    }, []);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    }, [processFile]);

    return (
        <div className="smart-asset-uploader">
            {/* Drop Zone */}
            <div
                className={`smart-asset-uploader__zone ${isDragging ? 'dragging' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleClick}
                id="asset-drop-zone"
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileInput}
                    style={{ display: 'none' }}
                    id="asset-file-input"
                />
                {analyzing ? (
                    <div className="smart-asset-uploader__analyzing">
                        <div className="smart-asset-uploader__spinner" />
                        <span>Analyzing with AI...</span>
                    </div>
                ) : (
                    <div className="smart-asset-uploader__prompt">
                        <span className="smart-asset-uploader__icon">📷</span>
                        <span>Drop image here or click to upload</span>
                        <span className="smart-asset-uploader__hint">
                            AI will auto-tag, extract colors, and detect content
                        </span>
                    </div>
                )}
            </div>

            {/* Last Analysis Result */}
            {lastResult && (
                <div className="smart-asset-uploader__result" id="asset-analysis-result">
                    <div className="smart-asset-uploader__result-header">
                        <span className="smart-asset-uploader__result-type">
                            {lastResult.type}
                        </span>
                        <span className="smart-asset-uploader__result-role">
                            → {lastResult.suggestedRole}
                        </span>
                    </div>
                    <p className="smart-asset-uploader__result-desc">
                        {lastResult.description}
                    </p>

                    {/* Colors */}
                    {lastResult.dominantColors.length > 0 && (
                        <div className="smart-asset-uploader__colors">
                            {lastResult.dominantColors.map((color, i) => (
                                <div
                                    key={i}
                                    className="smart-asset-uploader__color-swatch"
                                    style={{ backgroundColor: color }}
                                    title={color}
                                />
                            ))}
                        </div>
                    )}

                    {/* Tags */}
                    <div className="smart-asset-uploader__tags">
                        {lastResult.tags.map((tag, i) => (
                            <span key={i} className="smart-asset-uploader__tag">
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ── File Helpers ──

function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => resolve({ width: 0, height: 0 });
        img.src = dataUrl;
    });
}
