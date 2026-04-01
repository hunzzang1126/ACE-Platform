// ─────────────────────────────────────────────────
// LandingPricing — Pricing cards for landing page
// ─────────────────────────────────────────────────

import { useNavigate } from 'react-router-dom';

const CHECK = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

interface PricingCardProps {
    name: string;
    subtitle: string;
    price: string;
    priceSuffix?: string;
    features: string[];
    cta: string;
    onClick: () => void;
    highlighted?: boolean;
    badge?: string;
}

function PricingCard({ name, subtitle, price, priceSuffix, features, cta, onClick, highlighted, badge }: PricingCardProps) {
    return (
        <div className={`lp-price-card ${highlighted ? 'lp-price-card--highlight' : ''}`}>
            {badge && <div className="lp-price-badge">{badge}</div>}
            <h3 className="lp-price-name">{name}</h3>
            <p className="lp-price-subtitle">{subtitle}</p>
            <div className="lp-price-amount">
                <span className="lp-price-value">{price}</span>
                {priceSuffix && <span className="lp-price-suffix">{priceSuffix}</span>}
            </div>
            <button className={`lp-price-cta ${highlighted ? 'lp-price-cta--primary' : ''}`} onClick={onClick}>
                {cta}
            </button>
            <ul className="lp-price-features">
                {features.map((f, i) => (
                    <li key={i}>{CHECK}<span>{f}</span></li>
                ))}
            </ul>
        </div>
    );
}

export function LandingPricing({ addRef }: { addRef: (el: HTMLDivElement | null) => void }) {
    const navigate = useNavigate();

    return (
        <section id="pricing" className="lp-pricing fade-in-section" ref={addRef}>
            <div className="lp-section-label">Pricing</div>
            <h2 className="lp-section-title">Simple, Transparent Pricing</h2>
            <p className="lp-section-sub">Start free. Scale when you are ready.</p>

            <div className="lp-price-grid">
                <PricingCard
                    name="Starter"
                    subtitle="For individuals exploring Glid"
                    price="Free"
                    cta="Get Started"
                    onClick={() => navigate('/login')}
                    features={[
                        '3 Creative Sets',
                        '50 AI Generations / month',
                        'PNG Export',
                        'Community Support',
                    ]}
                />
                <PricingCard
                    name="Creator"
                    subtitle="For independent creators and freelancers"
                    price="$15"
                    priceSuffix="/month"
                    cta="Get Started"
                    onClick={() => navigate('/login')}
                    highlighted
                    badge="Most Popular"
                    features={[
                        '10 Creative Sets',
                        '200 AI Generations / month',
                        'PNG, JPG Export (no watermark)',
                        'Claude Sonnet AI model',
                        'Email Support',
                    ]}
                />
                <PricingCard
                    name="Pro"
                    subtitle="For professional teams and agencies"
                    price="$50"
                    priceSuffix="/month"
                    cta="Start Free Trial"
                    onClick={() => navigate('/login')}
                    features={[
                        'Unlimited Creative Sets',
                        '500 AI Generations / month',
                        'PNG, JPG, HTML5 Export',
                        'Up to 3 team members',
                        'Priority Support',
                    ]}
                />
                <PricingCard
                    name="Enterprise"
                    subtitle="Brand Cloud + unlimited team seats"
                    price="Custom"
                    cta="Contact Sales"
                    onClick={() => window.open('mailto:sales@glid.ai?subject=Enterprise%20Inquiry', '_blank')}
                    features={[
                        '5,000+ AI Generations / month',
                        'All export formats',
                        'Brand Cloud integration',
                        'Unlimited team seats',
                        'Dedicated account manager',
                    ]}
                />
            </div>
        </section>
    );
}
