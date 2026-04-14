// ─────────────────────────────────────────────────
// App.tsx – Router + Global Components
// ─────────────────────────────────────────────────
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppI18nProvider } from '@/i18n';

// Cloud Sync
import { useCloudSync } from '@/hooks/useCloudSync';

// Pages
import { LandingPage } from './LandingPage';
import { LoginPage } from './LoginPage';
import { AuthCallback } from './AuthCallback';

import { OnboardingPage } from './OnboardingPage';
import { AdminPage } from './AdminPage';
import { DashboardPage } from './DashboardPage';
import { TrashPage } from './TrashPage';
import { GeneralEditorPage } from './GeneralEditorPage';
import { DetailEditorPage } from './DetailEditorPage';

import PricingPage from './PricingPage';
import { TemplatesPage } from './TemplatesPage';
import { ActivityPage } from './ActivityPage';
import { OAuthCallbackPage } from './OAuthCallbackPage';
import { AboutPage } from './AboutPage';
import { PrivacyPage } from './PrivacyPage';
import { TermsPage } from './TermsPage';

// Components
import { GlobalAiPanel } from '../components/ai/GlobalAiPanel';
import { AiOnboardingTooltip } from '../components/ai/AiOnboardingTooltip';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { ToastContainer } from '../components/ui/Toast';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';

/** Renderless component that activates cloud sync on login */
function CloudSyncProvider() {
    useCloudSync();
    return null;
}

export default function App() {
    return (
        <ErrorBoundary>
            <AppI18nProvider>
            <BrowserRouter>
                <CloudSyncProvider />
                <Routes>
                    {/* ── Public Routes ── */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />

                    <Route path="/pricing" element={<PricingPage />} />
                    <Route path="/auth/callback/meta" element={<OAuthCallbackPage />} />
                    <Route path="/auth/callback/google-ads" element={<OAuthCallbackPage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/privacy" element={<PrivacyPage />} />
                    <Route path="/terms" element={<TermsPage />} />
                    <Route path="/onboarding" element={
                        <ProtectedRoute>
                            <OnboardingPage />
                        </ProtectedRoute>
                    } />

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
                                <AiOnboardingTooltip />
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
                                <AiOnboardingTooltip />
                            </div>
                        </ProtectedRoute>
                    } />
                    <Route path="/templates" element={
                        <ProtectedRoute>
                            <TemplatesPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/trash" element={
                        <ProtectedRoute>
                            <TrashPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/activity" element={
                        <ProtectedRoute>
                            <ActivityPage />
                        </ProtectedRoute>
                    } />

                    {/* ── Admin Routes ── */}
                    <Route path="/admin" element={
                        <ProtectedRoute adminOnly>
                            <AdminPage />
                        </ProtectedRoute>
                    } />


                </Routes>
                <ToastContainer />
            </BrowserRouter>
            </AppI18nProvider>
        </ErrorBoundary>
    );
}
