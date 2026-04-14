// ─────────────────────────────────────────────────
// Phase 4 New Components — Source-level tests
// ─────────────────────────────────────────────────
// Verifies: ShareModal, ReferralCard, AiOnboardingTooltip,
// ResultPreviewCard, ProjectThumbnail
// ─────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const shareModalSrc = readFileSync(resolve(__dirname, '../components/dashboard/ShareModal.tsx'), 'utf-8');
const referralCardSrc = readFileSync(resolve(__dirname, '../components/dashboard/ReferralCard.tsx'), 'utf-8');
const aiOnboardSrc = readFileSync(resolve(__dirname, '../components/ai/AiOnboardingTooltip.tsx'), 'utf-8');
const thumbnailSrc = readFileSync(resolve(__dirname, '../components/dashboard/ProjectThumbnail.tsx'), 'utf-8');
const onboardI18nSrc = readFileSync(resolve(__dirname, '../i18n/onboardingI18n.ts'), 'utf-8');
const shareI18nSrc = readFileSync(resolve(__dirname, '../i18n/shareI18n.ts'), 'utf-8');
const referralI18nSrc = readFileSync(resolve(__dirname, '../i18n/referralI18n.ts'), 'utf-8');

// ══════════════════════════════════════════════════
// ShareModal
// ══════════════════════════════════════════════════
describe('ShareModal — structure + brand', () => {
    it('has isOpen/onClose/projectId/projectName props', () => {
        expect(shareModalSrc).toContain('isOpen: boolean');
        expect(shareModalSrc).toContain('onClose: () =>');
        expect(shareModalSrc).toContain('projectId: string');
        expect(shareModalSrc).toContain('projectName: string');
    });

    it('generates share URL from projectId', () => {
        expect(shareModalSrc).toContain('/share/${projectId}');
    });

    it('generates iframe embed code', () => {
        expect(shareModalSrc).toContain('<iframe');
        expect(shareModalSrc).toContain('frameBorder');
    });

    it('uses navigator.clipboard with fallback', () => {
        expect(shareModalSrc).toContain('navigator.clipboard.writeText');
        expect(shareModalSrc).toContain('document.execCommand');
    });

    it('shows copied state with green color', () => {
        expect(shareModalSrc).toContain('#16a34a');
    });

    it('uses brand gradient on CTA', () => {
        expect(shareModalSrc).toContain('#6366F1');
        expect(shareModalSrc).toContain('#2DD4BF');
    });

    it('uses i18n keys from share namespace', () => {
        expect(shareModalSrc).toContain("t('share.title')");
        expect(shareModalSrc).toContain("t('share.copy')");
        expect(shareModalSrc).toContain("t('share.copied')");
        expect(shareModalSrc).toContain("t('share.embedLabel')");
    });

    it('returns null when not open', () => {
        expect(shareModalSrc).toContain('if (!isOpen) return null');
    });

    it('has backdrop with blur', () => {
        expect(shareModalSrc).toContain('backdropFilter');
        expect(shareModalSrc).toContain('blur(4px)');
    });
});

// ══════════════════════════════════════════════════
// ReferralCard
// ══════════════════════════════════════════════════
describe('ReferralCard — structure + brand', () => {
    it('generates deterministic referral code from userId', () => {
        expect(referralCardSrc).toContain('ACE-');
        expect(referralCardSrc).toContain('user.id.replace(/-/g');
        expect(referralCardSrc).toContain('.toUpperCase()');
    });

    it('builds referral URL with code', () => {
        expect(referralCardSrc).toContain('/signup?ref=${referralCode}');
    });

    it('displays 3 stat columns', () => {
        expect(referralCardSrc).toContain("t('referral.invited')");
        expect(referralCardSrc).toContain("t('referral.active')");
        expect(referralCardSrc).toContain("t('referral.credits')");
    });

    it('uses clipboard API with fallback', () => {
        expect(referralCardSrc).toContain('navigator.clipboard.writeText');
        expect(referralCardSrc).toContain('document.execCommand');
    });

    it('uses brand gradient on icon', () => {
        expect(referralCardSrc).toContain('#6366F1');
        expect(referralCardSrc).toContain('#2DD4BF');
    });

    it('uses CSS custom properties for theme', () => {
        expect(referralCardSrc).toContain('var(--bg-surface)');
        expect(referralCardSrc).toContain('var(--text-primary)');
        expect(referralCardSrc).toContain('var(--text-muted)');
    });

    it('shows reward info section', () => {
        expect(referralCardSrc).toContain("t('referral.rewardInfo')");
    });
});

// ══════════════════════════════════════════════════
// AiOnboardingTooltip
// ══════════════════════════════════════════════════
describe('AiOnboardingTooltip — structure + persistence', () => {
    it('uses userId-scoped localStorage key', () => {
        expect(aiOnboardSrc).toContain('ace-ai-onboard-seen');
        expect(aiOnboardSrc).toContain('${STORAGE_KEY}-${userId}');
    });

    it('delays appearance by 1200ms', () => {
        expect(aiOnboardSrc).toContain('setTimeout');
        expect(aiOnboardSrc).toContain('1200');
    });

    it('dismisses permanently to localStorage', () => {
        expect(aiOnboardSrc).toContain("localStorage.setItem(key, '1')");
    });

    it('returns null when not shown', () => {
        expect(aiOnboardSrc).toContain('if (!show) return null');
    });

    it('lists 3 AI features', () => {
        expect(aiOnboardSrc).toContain('onboard.feat1');
        expect(aiOnboardSrc).toContain('onboard.feat2');
        expect(aiOnboardSrc).toContain('onboard.feat3');
    });

    it('uses brand gradient on sparkle icon', () => {
        expect(aiOnboardSrc).toContain('#6366F1');
        expect(aiOnboardSrc).toContain('#2DD4BF');
    });

    it('shows keyboard shortcut hint', () => {
        expect(aiOnboardSrc).toContain("t('onboard.shortcut')");
    });

    it('has slide-in animation', () => {
        expect(aiOnboardSrc).toContain('slideInRight');
    });

    it('has scrim backdrop', () => {
        expect(aiOnboardSrc).toContain('rgba(0,0,0,0.25)');
    });
});

// ══════════════════════════════════════════════════
// ProjectThumbnail
// ══════════════════════════════════════════════════
describe('ProjectThumbnail — element rendering', () => {
    it('reads from designStore allCreativeSets', () => {
        expect(thumbnailSrc).toContain('useDesignStore.getState().allCreativeSets');
    });

    it('finds master variant', () => {
        expect(thumbnailSrc).toContain('cs.masterVariantId');
    });

    it('limits to 8 elements max', () => {
        expect(thumbnailSrc).toContain('.slice(0, 8)');
    });

    it('★ SINGLE RESOLVER: uses constraintsToAbsolute for positioning', () => {
        expect(thumbnailSrc).toContain('constraintsToAbsolute');
        expect(thumbnailSrc).toContain('abs.x * scaleX');
        expect(thumbnailSrc).toContain('abs.y * scaleY');
    });

    it('renders text elements differently (border-bottom)', () => {
        expect(thumbnailSrc).toContain("el.type === 'text'");
        expect(thumbnailSrc).toContain('borderBottom');
    });

    it('shows fallback icon when no data', () => {
        expect(thumbnailSrc).toContain('if (!elements)');
        expect(thumbnailSrc).toContain('<svg');
    });

    it('clamps element sizes', () => {
        expect(thumbnailSrc).toContain('Math.max(4');
        expect(thumbnailSrc).toContain('Math.max(2');
    });
});

// ══════════════════════════════════════════════════
// i18n Coverage — all 4 languages present
// ══════════════════════════════════════════════════
describe('i18n — onboarding namespace (4 languages)', () => {
    it('has EN translations', () => {
        expect(onboardI18nSrc).toContain("aiTitle: 'Meet Your AI Creative Director'");
    });
    it('has KO translations', () => {
        expect(onboardI18nSrc).toContain('AI 크리에이티브 디렉터를 만나보세요');
    });
    it('has JA translations', () => {
        expect(onboardI18nSrc).toContain('AIクリエイティブディレクター');
    });
    it('has ZH translations', () => {
        expect(onboardI18nSrc).toContain('AI创意总监');
    });
});

describe('i18n — share namespace (4 languages)', () => {
    it('has EN translations', () => {
        expect(shareI18nSrc).toContain("title: 'Share Creative'");
    });
    it('has KO translations', () => {
        expect(shareI18nSrc).toContain('크리에이티브 공유');
    });
    it('has JA translations', () => {
        expect(shareI18nSrc).toContain('クリエイティブを共有');
    });
    it('has ZH translations', () => {
        expect(shareI18nSrc).toContain('分享创意');
    });
});

describe('i18n — referral namespace (4 languages)', () => {
    it('has EN translations', () => {
        expect(referralI18nSrc).toContain("title: 'Invite Friends'");
    });
    it('has KO translations', () => {
        expect(referralI18nSrc).toContain('친구 초대');
    });
    it('has JA translations', () => {
        expect(referralI18nSrc).toContain('友達を招待');
    });
    it('has ZH translations', () => {
        expect(referralI18nSrc).toContain('邀请好友');
    });
});
