// ─────────────────────────────────────────────────
// App.tsx – Router + Global Components
// ─────────────────────────────────────────────────
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Pages
import { LandingPage } from './LandingPage';
import { LoginPage } from './LoginPage';
import { AuthCallback } from './AuthCallback';
import { PendingPage } from './PendingPage';
import { AdminPage } from './AdminPage';
import { DashboardPage } from './DashboardPage';
import { TrashPage } from './TrashPage';
import { GeneralEditorPage } from './GeneralEditorPage';
import { DetailEditorPage } from './DetailEditorPage';
import EngineTestPage from './EngineTestPage';
import AnimationTestPage from './AnimationTestPage';
import EffectsTestPage from './EffectsTestPage';
import ExportTestPage from './ExportTestPage';
import AiTestPage from './AiTestPage';

// Components
import { TemplateGallery } from '../components/editor/TemplateGallery';
import { GlobalAiPanel } from '../components/ai/GlobalAiPanel';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { ToastContainer } from '../components/ui/Toast';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';

export default function App() {
    return (
        <ErrorBoundary>
            <BrowserRouter>
                <Routes>
                    {/* ── Public Routes ── */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route path="/pending" element={<PendingPage />} />

                    {/* ── Protected Routes (auth + approved role required) ── */}
                    <Route path="/dashboard" element={
                        <ProtectedRoute>
                            <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
                                <div style={{ flex: 1, minWidth: 0, overflow: 'auto', transition: 'flex 0.3s ease' }}>
                                    <DashboardPage />
                                </div>
                                <GlobalAiPanel />
                            </div>
                        </ProtectedRoute>
                    } />
                    <Route path="/editor" element={
                        <ProtectedRoute>
                            <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
                                <div style={{ flex: 1, minWidth: 0, overflow: 'auto', transition: 'flex 0.3s ease' }}>
                                    <GeneralEditorPage />
                                </div>
                                <GlobalAiPanel />
                            </div>
                        </ProtectedRoute>
                    } />
                    <Route path="/editor/detail/:variantId" element={
                        <ProtectedRoute>
                            <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
                                <div style={{ flex: 1, minWidth: 0, overflow: 'auto', transition: 'flex 0.3s ease' }}>
                                    <DetailEditorPage />
                                </div>
                                <GlobalAiPanel />
                            </div>
                        </ProtectedRoute>
                    } />
                    <Route path="/templates" element={
                        <ProtectedRoute>
                            <div className="dashboard-layout"><div style={{ flex: 1, padding: 24 }}><TemplateGallery /></div></div>
                        </ProtectedRoute>
                    } />
                    <Route path="/trash" element={
                        <ProtectedRoute>
                            <TrashPage />
                        </ProtectedRoute>
                    } />

                    {/* ── Admin Routes ── */}
                    <Route path="/admin" element={
                        <ProtectedRoute adminOnly>
                            <AdminPage />
                        </ProtectedRoute>
                    } />

                    {/* ── Dev/Test Routes (protected) ── */}
                    <Route path="/engine-test" element={<ProtectedRoute><EngineTestPage /></ProtectedRoute>} />
                    <Route path="/animation-test" element={<ProtectedRoute><AnimationTestPage /></ProtectedRoute>} />
                    <Route path="/effects-test" element={<ProtectedRoute><EffectsTestPage /></ProtectedRoute>} />
                    <Route path="/export-test" element={<ProtectedRoute><ExportTestPage /></ProtectedRoute>} />
                    <Route path="/ai-test" element={<ProtectedRoute><AiTestPage /></ProtectedRoute>} />
                </Routes>
                <ToastContainer />
            </BrowserRouter>
        </ErrorBoundary>
    );
}
