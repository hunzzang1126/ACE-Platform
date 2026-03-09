// ─────────────────────────────────────────────────
// App.tsx – Router + Global Components
// ─────────────────────────────────────────────────
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DashboardPage } from './DashboardPage';
import { TrashPage } from './TrashPage';
import { GeneralEditorPage } from './GeneralEditorPage';
import { DetailEditorPage } from './DetailEditorPage';
import EngineTestPage from './EngineTestPage';
import AnimationTestPage from './AnimationTestPage';
import EffectsTestPage from './EffectsTestPage';
import ExportTestPage from './ExportTestPage';
import AiTestPage from './AiTestPage';

import { GlobalAiPanel } from '../components/ai/GlobalAiPanel';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { ToastContainer } from '../components/ui/Toast';

export default function App() {
    return (
        <ErrorBoundary>
            <BrowserRouter>
                {/* Flex row: main content shrinks when AI panel opens */}
                <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
                    <div style={{ flex: 1, minWidth: 0, overflow: 'auto', transition: 'flex 0.3s ease' }}>
                        <Routes>
                            <Route path="/" element={<DashboardPage />} />
                            <Route path="/editor" element={<GeneralEditorPage />} />
                            <Route path="/editor/detail/:variantId" element={<DetailEditorPage />} />
                            <Route path="/engine-test" element={<EngineTestPage />} />
                            <Route path="/animation-test" element={<AnimationTestPage />} />
                            <Route path="/effects-test" element={<EffectsTestPage />} />
                            <Route path="/export-test" element={<ExportTestPage />} />
                            <Route path="/ai-test" element={<AiTestPage />} />
                            <Route path="/trash" element={<TrashPage />} />
                        </Routes>
                    </div>
                    <GlobalAiPanel />
                </div>
                <ToastContainer />
            </BrowserRouter>
        </ErrorBoundary>
    );
}

