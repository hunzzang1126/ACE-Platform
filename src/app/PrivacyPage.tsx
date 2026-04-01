// ─────────────────────────────────────────────────
// PrivacyPage — Privacy Policy for Google Ads API compliance
// ─────────────────────────────────────────────────

import { useNavigate, Link } from 'react-router-dom';
import { GlidLogo } from '@/components/brand/GlidLogo';
import './legal.css';

export function PrivacyPage() {
    const navigate = useNavigate();

    return (
        <div className="legal-page">
            <header className="legal-header">
                <div className="legal-header-inner">
                    <div className="legal-logo" onClick={() => navigate('/')} role="button" tabIndex={0}>
                        <GlidLogo size={22} variant="white" />
                    </div>
                    <nav className="legal-nav">
                        <Link to="/">Home</Link>
                        <Link to="/about">About</Link>
                        <Link to="/terms">Terms</Link>
                    </nav>
                </div>
            </header>

            <main className="legal-content">
                <h1>Privacy Policy</h1>
                <p className="legal-effective">Effective Date: April 1, 2026</p>

                <section className="legal-section">
                    <h2>1. Introduction</h2>
                    <p>
                        Glid Technologies Inc. ("Glid," "we," "us," or "our") operates the ACE creative platform
                        (the "Service"). This Privacy Policy explains how we collect, use, disclose, and safeguard
                        your information when you use our Service, including any interactions with third-party
                        advertising platforms such as Google Ads and Meta Ads.
                    </p>
                    <p>
                        By accessing or using the Service, you agree to the terms of this Privacy Policy.
                        If you do not agree, please do not use the Service.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>2. Information We Collect</h2>
                    <h3>2.1 Information You Provide</h3>
                    <ul>
                        <li><strong>Account Information:</strong> Name, email address, and organization name when you register.</li>
                        <li><strong>Payment Information:</strong> Billing details processed securely through Stripe. We do not store credit card numbers on our servers.</li>
                        <li><strong>Creative Content:</strong> Designs, images, text, brand assets, and templates you create or upload.</li>
                        <li><strong>Communications:</strong> Messages sent through our support or feedback channels.</li>
                    </ul>
                    <h3>2.2 Information Collected Automatically</h3>
                    <ul>
                        <li><strong>Usage Data:</strong> Pages visited, features used, session duration, and interaction patterns.</li>
                        <li><strong>Device Data:</strong> Browser type, operating system, screen resolution, and IP address.</li>
                        <li><strong>Cookies:</strong> Session cookies for authentication and preferences. We do not use third-party tracking cookies.</li>
                    </ul>
                    <h3>2.3 Information from Third-Party Services</h3>
                    <ul>
                        <li><strong>Google Ads:</strong> When you connect your Google Ads account, we access campaign performance data (impressions, clicks, conversions, spend) through the Google Ads API using OAuth 2.0. We only access data you explicitly authorize.</li>
                        <li><strong>Meta Ads:</strong> When you connect your Meta Ads account, we access ad account information and campaign metrics through the Meta Marketing API.</li>
                        <li><strong>Supabase Auth:</strong> Authentication is handled through Supabase. We receive your email and authentication tokens.</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>3. How We Use Your Information</h2>
                    <ul>
                        <li>To provide, maintain, and improve the Service.</li>
                        <li>To authenticate your identity and manage your account.</li>
                        <li>To deploy advertising creatives to connected ad platforms on your behalf.</li>
                        <li>To retrieve and display campaign performance metrics for creative optimization.</li>
                        <li>To generate AI-powered design suggestions based on your brand kit and preferences.</li>
                        <li>To process payments and manage subscriptions.</li>
                        <li>To communicate service updates, security alerts, and support responses.</li>
                        <li>To detect, prevent, and address technical issues or abuse.</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>4. Google Ads API Data Usage</h2>
                    <p>Our use of the Google Ads API complies with the <a href="https://developers.google.com/google-ads/api/docs/terms" target="_blank" rel="noopener noreferrer">Google Ads API Terms and Conditions</a>.</p>
                    <ul>
                        <li>We access Google Ads data only with your explicit OAuth consent.</li>
                        <li>We use campaign performance data solely to display reports and optimize creative performance within the ACE platform.</li>
                        <li>We do not sell, share, or disclose Google Ads data to third parties.</li>
                        <li>We do not use Google Ads data for purposes unrelated to advertising campaign management.</li>
                        <li>OAuth refresh tokens are stored securely and encrypted at rest. You may revoke access at any time through your Google Account settings or within ACE.</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>5. Data Sharing and Disclosure</h2>
                    <p>We do not sell your personal information. We may share information only in the following circumstances:</p>
                    <ul>
                        <li><strong>Service Providers:</strong> Trusted third parties that assist in operating the Service (e.g., Supabase for database hosting, Stripe for payments, OpenRouter for AI processing). These providers are contractually obligated to protect your data.</li>
                        <li><strong>Legal Requirements:</strong> When required by law, regulation, or legal process.</li>
                        <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets, your data may be transferred. We will provide notice before your data is subject to a different privacy policy.</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>6. Data Security</h2>
                    <p>
                        We implement industry-standard security measures including TLS encryption in transit,
                        AES-256 encryption at rest, and role-based access controls. While no system is completely
                        secure, we take commercially reasonable steps to protect your data.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>7. Data Retention</h2>
                    <p>
                        We retain your account data for as long as your account is active. Creative content is
                        retained for 30 days after deletion (trash recovery period). Campaign performance data
                        from connected ad platforms is cached for up to 90 days. You may request complete
                        deletion of your data by contacting us at <a href="mailto:privacy@glid.ai">privacy@glid.ai</a>.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>8. Your Rights</h2>
                    <p>Depending on your jurisdiction, you may have the right to:</p>
                    <ul>
                        <li>Access and receive a copy of your personal data.</li>
                        <li>Correct inaccurate data.</li>
                        <li>Request deletion of your data.</li>
                        <li>Object to or restrict processing of your data.</li>
                        <li>Data portability — receive your data in a structured, machine-readable format.</li>
                        <li>Withdraw consent for data processing at any time.</li>
                    </ul>
                    <p>To exercise these rights, contact us at <a href="mailto:privacy@glid.ai">privacy@glid.ai</a>.</p>
                </section>

                <section className="legal-section">
                    <h2>9. Children's Privacy</h2>
                    <p>
                        The Service is not intended for individuals under 16 years of age. We do not knowingly
                        collect personal information from children.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>10. Changes to This Policy</h2>
                    <p>
                        We may update this Privacy Policy from time to time. We will notify you of any material
                        changes by posting the new policy on this page and updating the "Effective Date."
                        Continued use of the Service after changes constitutes acceptance of the updated policy.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>11. Contact Us</h2>
                    <p>If you have questions about this Privacy Policy, contact us at:</p>
                    <address>
                        Glid Technologies Inc.<br />
                        50 Power Street<br />
                        Toronto, Ontario M5A 0V3<br />
                        Canada<br />
                        <a href="mailto:privacy@glid.ai">privacy@glid.ai</a>
                    </address>
                </section>
            </main>

            <footer className="legal-footer">
                <span>&copy; {new Date().getFullYear()} Glid Technologies Inc. All rights reserved.</span>
                <span className="legal-footer-address">50 Power St, Toronto, ON M5A 0V3, Canada</span>
            </footer>
        </div>
    );
}
