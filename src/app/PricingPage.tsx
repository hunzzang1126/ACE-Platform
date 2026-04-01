// ─────────────────────────────────────────────────
// PricingPage — 4-tier plan selection
// ─────────────────────────────────────────────────
// Premium dark-mode pricing page with feature comparison.
// Accessible from dashboard and landing page.
// ─────────────────────────────────────────────────

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { PLANS, type PlanTier } from '@/schema/planTypes';
import { redirectToCheckout, isStripeConfigured } from '@/services/stripeService';

const CHECK = '\u2713';
const DASH = '\u2014';

export default function PricingPage() {
    const navigate = useNavigate();
    const user = useAuthStore(s => s.user);
    const currentPlan = (user?.plan as PlanTier) ?? 'starter';
    const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
    const [loading, setLoading] = useState(false);

    const handleSelectPlan = async (tier: PlanTier) => {
        console.log('[pricing] handleSelectPlan called:', { tier, currentPlan, user: !!user, isConfigured: isStripeConfigured() });
        if (tier === currentPlan) { console.log('[pricing] same plan, skipping'); return; }
        if (tier === 'starter') {
            alert('To downgrade, please contact support.');
            return;
        }
        if (tier === 'enterprise') {
            window.open('mailto:sales@glid.ai?subject=Enterprise Plan Inquiry', '_blank');
            return;
        }

        // ★ Creator or Pro upgrade — Stripe Checkout
        if (!isStripeConfigured()) {
            console.error('[pricing] Stripe NOT configured. VITE_STRIPE_PUBLISHABLE_KEY:', import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
            alert('Payment system is being set up. Please try again shortly.');
            return;
        }
        if (!user) {
            console.log('[pricing] No user, redirecting to login');
            navigate('/login');
            return;
        }

        console.log('[pricing] Starting checkout for:', { tier, billing, userId: user.id, email: user.email });
        setLoading(true);
        const { error } = await redirectToCheckout(tier, user.id, user.email ?? '', billing);
        setLoading(false);

        if (error) {
            console.error('[pricing] Checkout error:', error);
            alert(error);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #0a0e1a 0%, #111827 50%, #0a0e1a 100%)',
            color: '#f1f5f9',
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        }}>
            {/* Nav */}
            <nav style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '20px 40px', maxWidth: 1200, margin: '0 auto',
            }}>
                <button
                    onClick={() => navigate(user ? '/dashboard' : '/')}
                    style={{
                        background: 'none', border: 'none', color: '#818cf8',
                        fontSize: 22, fontWeight: 700, cursor: 'pointer',
                        letterSpacing: '-0.5px',
                    }}
                >
                    Glid
                </button>
                {user && (
                    <button
                        onClick={() => navigate('/dashboard')}
                        style={{
                            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                            color: '#94a3b8', borderRadius: 8, padding: '8px 16px',
                            cursor: 'pointer', fontSize: 13,
                        }}
                    >
                        Back to Dashboard
                    </button>
                )}
            </nav>

            {/* Hero */}
            <div style={{ textAlign: 'center', padding: '40px 20px 0' }}>
                <h1 style={{
                    fontSize: 48, fontWeight: 800, margin: 0,
                    background: 'linear-gradient(135deg, #818cf8, #c084fc)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    letterSpacing: '-1px',
                }}>
                    Choose your plan
                </h1>
                <p style={{ color: '#94a3b8', fontSize: 18, marginTop: 12 }}>
                    Start free. Scale as your creative output grows.
                </p>

                {/* Billing toggle */}
                <div style={{
                    display: 'inline-flex', gap: 0, marginTop: 28,
                    background: 'rgba(255,255,255,0.06)', borderRadius: 10,
                    padding: 3, border: '1px solid rgba(255,255,255,0.08)',
                }}>
                    {(['monthly', 'annual'] as const).map(b => (
                        <button
                            key={b}
                            onClick={() => setBilling(b)}
                            style={{
                                padding: '8px 20px', borderRadius: 8, border: 'none',
                                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                background: billing === b ? 'rgba(129,140,248,0.2)' : 'transparent',
                                color: billing === b ? '#818cf8' : '#64748b',
                                transition: 'all 0.2s',
                            }}
                        >
                            {b === 'monthly' ? 'Monthly' : 'Annual'}
                            {b === 'annual' && <span style={{ color: '#34d399', marginLeft: 6, fontSize: 11 }}>Save 20%</span>}
                        </button>
                    ))}
                </div>
            </div>

            {/* Plan Cards */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 20, maxWidth: 1200, margin: '48px auto 0', padding: '0 20px',
            }}>
                {PLANS.map(plan => {
                    const isCurrent = plan.tier === currentPlan;
                    const isPopular = plan.popular;
                    const price = billing === 'monthly' ? plan.priceMonthly : plan.priceAnnual;

                    return (
                        <div
                            key={plan.tier}
                            style={{
                                background: isPopular
                                    ? 'linear-gradient(135deg, rgba(129,140,248,0.12), rgba(192,132,252,0.08))'
                                    : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${isPopular ? 'rgba(129,140,248,0.3)' : 'rgba(255,255,255,0.06)'}`,
                                borderRadius: 16, padding: 32,
                                position: 'relative', overflow: 'hidden',
                                transition: 'transform 0.2s, border-color 0.2s',
                            }}
                            onMouseEnter={e => {
                                (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                                (e.currentTarget as HTMLElement).style.borderColor = isPopular ? 'rgba(129,140,248,0.5)' : 'rgba(255,255,255,0.15)';
                            }}
                            onMouseLeave={e => {
                                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                                (e.currentTarget as HTMLElement).style.borderColor = isPopular ? 'rgba(129,140,248,0.3)' : 'rgba(255,255,255,0.06)';
                            }}
                        >
                            {/* Popular badge */}
                            {isPopular && (
                                <div style={{
                                    position: 'absolute', top: 16, right: 16,
                                    background: 'linear-gradient(135deg, #818cf8, #c084fc)',
                                    color: '#fff', fontSize: 11, fontWeight: 700,
                                    padding: '4px 10px', borderRadius: 20,
                                    letterSpacing: '0.5px', textTransform: 'uppercase',
                                }}>
                                    Most Popular
                                </div>
                            )}

                            {/* Plan name */}
                            <h3 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#e2e8f0' }}>
                                {plan.name}
                            </h3>
                            <p style={{ color: '#94a3b8', fontSize: 13, margin: '6px 0 20px' }}>
                                {plan.tagline}
                            </p>

                            {/* Price */}
                            <div style={{ marginBottom: 24 }}>
                                {price === 0 ? (
                                    <span style={{ fontSize: 42, fontWeight: 800, color: '#f1f5f9' }}>Free</span>
                                ) : price === -1 ? (
                                    <span style={{ fontSize: 42, fontWeight: 800, color: '#f1f5f9' }}>Custom</span>
                                ) : (
                                    <>
                                        <span style={{ fontSize: 42, fontWeight: 800, color: '#f1f5f9' }}>
                                            ${price}
                                        </span>
                                        <span style={{ color: '#64748b', fontSize: 14, marginLeft: 4 }}>
                                            /month
                                        </span>
                                    </>
                                )}
                            </div>

                            {/* CTA */}
                            <button
                                onClick={() => handleSelectPlan(plan.tier)}
                                disabled={isCurrent}
                                style={{
                                    width: '100%', padding: '12px 0', borderRadius: 10,
                                    border: isCurrent ? '1px solid rgba(255,255,255,0.1)' : 'none',
                                    background: isCurrent
                                        ? 'transparent'
                                        : isPopular
                                            ? 'linear-gradient(135deg, #818cf8, #6366f1)'
                                            : 'rgba(255,255,255,0.08)',
                                    color: isCurrent ? '#64748b' : '#fff',
                                    fontSize: 14, fontWeight: 600, cursor: isCurrent ? 'default' : 'pointer',
                                    transition: 'opacity 0.2s',
                                }}
                            >
                                {isCurrent ? 'Current Plan' : plan.tier === 'enterprise' ? 'Contact Sales' : 'Get Started'}
                            </button>

                            {/* Features */}
                            <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <Feature
                                    label="Creative Sets"
                                    value={plan.limits.maxCreativeSets === -1 ? 'Unlimited' : `${plan.limits.maxCreativeSets}`}
                                />
                                <Feature
                                    label="AI Token Budget"
                                    value={plan.limits.aiTokensPerMonth >= Number.MAX_SAFE_INTEGER
                                        ? 'Unlimited'
                                        : `${plan.limits.aiTokensPerMonth.toLocaleString()}/mo`}
                                />
                                <Feature
                                    label="AI Model"
                                    value={plan.limits.allowedModels.some(m => m.includes('sonnet')) ? 'Sonnet 4 (Premium)' : 'Haiku 3.5 (Fast)'}
                                    highlight={plan.limits.allowedModels.some(m => m.includes('sonnet'))}
                                />
                                <Feature
                                    label="Size Variants"
                                    value={plan.limits.maxVariantsPerSet === -1 ? 'Unlimited' : `${plan.limits.maxVariantsPerSet} per set`}
                                />
                                <Feature
                                    label="Export Formats"
                                    value={plan.limits.allowedExports.map(e => e.toUpperCase()).join(', ')}
                                />
                                <Feature
                                    label="Brand Cloud"
                                    value={plan.limits.brandCloudEnabled ? CHECK : DASH}
                                    highlight={plan.limits.brandCloudEnabled}
                                />
                                <Feature
                                    label="Team Members"
                                    value={plan.limits.maxTeamMembers === -1 ? 'Unlimited' : `${plan.limits.maxTeamMembers}`}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer CTA */}
            <div style={{ textAlign: 'center', padding: '60px 20px 40px' }}>
                <p style={{ color: '#64748b', fontSize: 14 }}>
                    All plans include: Drag-and-drop editor, Smart sizing, Export to production-ready formats
                </p>
                <p style={{ color: '#475569', fontSize: 12, marginTop: 8 }}>
                    Questions? Contact us at sales@glid.ai
                </p>
            </div>
        </div>
    );
}

// ── Feature row component ──
function Feature({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
            <span style={{ color: '#94a3b8' }}>{label}</span>
            <span style={{
                color: highlight ? '#34d399' : '#e2e8f0',
                fontWeight: 600, fontSize: 12,
            }}>
                {value}
            </span>
        </div>
    );
}
