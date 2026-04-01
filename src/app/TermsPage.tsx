// ─────────────────────────────────────────────────
// TermsPage — Terms of Service for Google Ads API compliance
// ─────────────────────────────────────────────────

import { useNavigate, Link } from 'react-router-dom';
import { GlidLogo } from '@/components/brand/GlidLogo';
import './legal.css';

export function TermsPage() {
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
                        <Link to="/privacy">Privacy</Link>
                    </nav>
                </div>
            </header>

            <main className="legal-content">
                <h1>Terms of Service</h1>
                <p className="legal-effective">Effective Date: April 1, 2026</p>

                <section className="legal-section">
                    <h2>1. Acceptance of Terms</h2>
                    <p>
                        These Terms of Service ("Terms") govern your access to and use of the ACE creative platform
                        (the "Service") operated by Glid Technologies Inc. ("Glid," "we," "us," or "our").
                        By creating an account or using the Service, you agree to be bound by these Terms.
                        If you do not agree, you may not use the Service.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>2. Description of Service</h2>
                    <p>
                        ACE is a SaaS creative management platform that enables users to design, generate,
                        manage, and deploy digital advertising creatives across multiple channels. Features include:
                    </p>
                    <ul>
                        <li>AI-powered creative design and generation</li>
                        <li>Multi-format smart sizing and responsive design</li>
                        <li>Template management and brand kit enforcement</li>
                        <li>Integration with advertising platforms (Google Ads, Meta Ads)</li>
                        <li>Campaign performance analytics and creative optimization</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>3. Account Registration</h2>
                    <p>
                        To use the Service, you must create an account with accurate and complete information.
                        You are responsible for maintaining the confidentiality of your account credentials and
                        for all activities that occur under your account. You must notify us immediately of
                        any unauthorized use.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>4. Subscription Plans and Payments</h2>
                    <p>
                        The Service offers multiple subscription tiers (Free, Creator, Pro, Enterprise) as
                        described on our pricing page. Paid subscriptions are billed monthly or annually
                        through Stripe.
                    </p>
                    <ul>
                        <li>Payments are non-refundable except as required by applicable law.</li>
                        <li>We reserve the right to modify pricing with 30 days' advance notice.</li>
                        <li>Failure to pay may result in suspension or termination of your account.</li>
                        <li>Free tier usage is subject to published limits on AI generations and exports per month.</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>5. User Content</h2>
                    <h3>5.1 Ownership</h3>
                    <p>
                        You retain all ownership rights to creative content you create, upload, or generate
                        using the Service ("User Content"). Glid does not claim ownership of your designs,
                        images, copy, or brand assets.
                    </p>
                    <h3>5.2 License Grant</h3>
                    <p>
                        By using the Service, you grant Glid a limited, non-exclusive, worldwide license to
                        host, store, process, and display your User Content solely for the purpose of providing
                        the Service. This license terminates when you delete your content or close your account.
                    </p>
                    <h3>5.3 Prohibited Content</h3>
                    <p>You may not use the Service to create or distribute content that:</p>
                    <ul>
                        <li>Is unlawful, defamatory, or fraudulent.</li>
                        <li>Infringes on intellectual property rights of third parties.</li>
                        <li>Contains malware, viruses, or harmful code.</li>
                        <li>Violates the advertising policies of connected platforms (Google Ads, Meta Ads).</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>6. Third-Party Platform Integrations</h2>
                    <p>
                        The Service integrates with third-party advertising platforms. By connecting your
                        advertising accounts, you authorize ACE to:
                    </p>
                    <ul>
                        <li>Upload creative assets to your ad campaigns.</li>
                        <li>Retrieve campaign performance data for reporting and optimization.</li>
                        <li>Manage ad assets within your authorized ad groups.</li>
                    </ul>
                    <p>
                        Your use of third-party platforms is subject to their respective terms of service.
                        Glid is not responsible for actions taken by third-party platforms on your content.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>7. AI-Generated Content</h2>
                    <p>
                        The Service uses artificial intelligence to generate design suggestions, layouts, and
                        creative assets. AI-generated content is provided "as is" without guarantee of accuracy,
                        suitability, or compliance with any specific advertising policy. You are responsible for
                        reviewing all AI-generated content before publishing or deploying it.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>8. Intellectual Property</h2>
                    <p>
                        The Service, including its software, design, trademarks, and documentation, is owned by
                        Glid Technologies Inc. and is protected by intellectual property laws. You may not copy,
                        modify, distribute, or reverse-engineer any part of the Service without our prior
                        written consent.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>9. Limitation of Liability</h2>
                    <p>
                        To the maximum extent permitted by applicable law, Glid shall not be liable for any
                        indirect, incidental, special, consequential, or punitive damages, including loss of
                        profits, data, or business opportunities, arising from your use of the Service.
                        Our total liability shall not exceed the amount paid by you in the twelve (12) months
                        preceding the claim.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>10. Disclaimer of Warranties</h2>
                    <p>
                        The Service is provided "as is" and "as available" without warranties of any kind,
                        either express or implied, including but not limited to implied warranties of
                        merchantability, fitness for a particular purpose, and non-infringement.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>11. Termination</h2>
                    <p>
                        Either party may terminate this agreement at any time. You may close your account
                        through the Service settings. We may suspend or terminate your account if you violate
                        these Terms. Upon termination, your right to use the Service ceases immediately.
                        We will retain your data for 30 days to allow for export, after which it will be deleted.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>12. Governing Law</h2>
                    <p>
                        These Terms shall be governed by and construed in accordance with the laws of the
                        Province of Ontario and the federal laws of Canada applicable therein, without regard
                        to conflict of law principles.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>13. Changes to Terms</h2>
                    <p>
                        We may revise these Terms from time to time. We will notify users of material changes
                        by email or through the Service. Continued use of the Service after changes constitutes
                        acceptance of the revised Terms.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>14. Contact</h2>
                    <p>For questions about these Terms, contact us at:</p>
                    <address>
                        Glid Technologies Inc.<br />
                        50 Power Street<br />
                        Toronto, Ontario M5A 0V3<br />
                        Canada<br />
                        <a href="mailto:legal@glid.ai">legal@glid.ai</a>
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
