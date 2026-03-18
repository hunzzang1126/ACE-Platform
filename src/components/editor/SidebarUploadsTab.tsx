// ─────────────────────────────────────────────────
// SidebarUploadsTab — File upload + asset library
// ─────────────────────────────────────────────────

interface Props {
    onTriggerImageUpload?: () => void;
    onTriggerVideoUpload?: () => void;
}

export function SidebarUploadsTab({ onTriggerImageUpload, onTriggerVideoUpload }: Props) {
    return (
        <div className="sidebar-uploads">
            <div className="sidebar-upload-actions">
                <button className="sidebar-upload-btn primary" onClick={onTriggerImageUpload}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Upload Image
                </button>
                <button className="sidebar-upload-btn" onClick={onTriggerVideoUpload}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="4" width="15" height="16" rx="2" />
                        <path d="M17 9l5-3v12l-5-3" />
                    </svg>
                    Upload Video
                </button>
            </div>

            <div className="sidebar-divider" />

            <div className="sidebar-drop-zone">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <p>Drop files here</p>
                <span>Images, videos, SVGs</span>
            </div>
        </div>
    );
}
