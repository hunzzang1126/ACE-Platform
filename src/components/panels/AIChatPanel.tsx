// ─────────────────────────────────────────────────
// AIChatPanel – AI Agent chat panel (Future: Claude API)
// ─────────────────────────────────────────────────
import { useState, useRef, useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';

interface ChatMessage {
    role: 'user' | 'ai';
    text: string;
    timestamp: number;
}

export function AIChatPanel() {
    const aiChatOpen = useUIStore((s) => s.aiChatOpen);
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'ai', text: 'ACE AI Agent ready. Ask me about your design or request changes!', timestamp: Date.now() },
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [messages]);

    if (!aiChatOpen) return null;

    const handleSend = () => {
        const text = input.trim();
        if (!text || isThinking) return;

        setMessages((prev) => [...prev, { role: 'user', text, timestamp: Date.now() }]);
        setInput('');
        setIsThinking(true);

        // Simulate AI response (will be replaced with real Claude API)
        setTimeout(() => {
            let response = '';
            const lower = text.toLowerCase();

            if (lower.includes('color') || lower.includes('colour')) {
                response = 'To change colors, select an element and use the Color picker in the Property Panel on the right. I can also adjust colors programmatically — tell me which element and what color you want.';
            } else if (lower.includes('font') || lower.includes('text') || lower.includes('size')) {
                response = 'You can modify text properties by selecting a text element. The Property Panel will show Font Family, Weight, Size, Color, and Alignment options.';
            } else if (lower.includes('resize') || lower.includes('scale')) {
                response = 'Select any element and drag the resize handles to scale it. You can also enter exact dimensions in the Property Panel (W and H fields).';
            } else if (lower.includes('layer') || lower.includes('order') || lower.includes('z-index')) {
                response = 'Reorder layers by dragging them in the Layers panel at the bottom. For shapes, use the Layer Order buttons in the Property Panel.';
            } else if (lower.includes('export') || lower.includes('save') || lower.includes('download')) {
                response = 'Export functionality is coming soon. You can currently save your work using the save button in the toolbar.';
            } else if (lower.includes('help') || lower.includes('what can')) {
                response = 'I can help with:\n• Changing colors, fonts, and sizes\n• Resizing and repositioning elements\n• Understanding layer management\n• General design suggestions\n\nJust describe what you need!';
            } else if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey')) {
                response = 'Hello! I\'m the ACE AI Agent. How can I help with your design today?';
            } else {
                response = `I understand you want to "${text}". This feature will be available when the Claude API integration is complete. For now, I can help with basic design questions — try asking about colors, fonts, layers, or resizing!`;
            }

            setMessages((prev) => [...prev, { role: 'ai', text: response, timestamp: Date.now() }]);
            setIsThinking(false);
        }, 800);
    };

    return (
        <div className="ai-chat-root">
            <div className="ai-chat-header">
                <span className="ai-chat-title">🤖 ACE AI Agent</span>
                <span className="ai-chat-badge">Preview</span>
            </div>
            <div className="ai-chat-messages" ref={listRef}>
                {messages.map((msg, i) => (
                    <div key={i} className={`ai-chat-msg ${msg.role}`}>
                        {msg.role === 'ai' && <span className="ai-chat-avatar">🤖</span>}
                        <div className="ai-chat-bubble">
                            {msg.text.split('\n').map((line, j) => (
                                <span key={j}>{line}{j < msg.text.split('\n').length - 1 && <br />}</span>
                            ))}
                        </div>
                    </div>
                ))}
                {isThinking && (
                    <div className="ai-chat-msg ai">
                        <span className="ai-chat-avatar">🤖</span>
                        <div className="ai-chat-bubble ai-thinking">
                            <span className="ai-dots">
                                <span>•</span><span>•</span><span>•</span>
                            </span>
                        </div>
                    </div>
                )}
            </div>
            <div className="ai-chat-input-area">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); e.stopPropagation(); }}
                    placeholder="Ask AI anything..."
                    className="ai-chat-input"
                    disabled={isThinking}
                />
                <button
                    onClick={handleSend}
                    className="ai-chat-send"
                    disabled={isThinking || !input.trim()}
                >
                    Send
                </button>
            </div>
        </div>
    );
}
