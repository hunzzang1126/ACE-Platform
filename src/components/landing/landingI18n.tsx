// ─────────────────────────────────────────────────
// Landing i18n — translations + context + hook
// ─────────────────────────────────────────────────

import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

export type LandingLang = 'en' | 'ko' | 'ja' | 'zh' | 'es' | 'fr' | 'de' | 'pt' | 'it' | 'th';

export const LANG_OPTIONS: { code: LandingLang; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'ko', label: '한국어' },
    { code: 'ja', label: '日本語' },
    { code: 'zh', label: '中文' },
    { code: 'es', label: 'Español' },
    { code: 'fr', label: 'Français' },
    { code: 'de', label: 'Deutsch' },
    { code: 'pt', label: 'Português' },
    { code: 'it', label: 'Italiano' },
    { code: 'th', label: 'ไทย' },
];

// ── Translation keys (derived from EN as source of truth) ──
const EN = {
    navFeatures: 'Features', navSizing: 'Smart Sizing', navPricing: 'Pricing',
    navSignIn: 'Sign In', navCta: 'Get Started Free',
    heroBadge: 'AI Creative Platform',
    heroTitle1: 'One Design.', heroTitle2: 'Every Size. Instantly.',
    heroSub: 'Design once, resize to every format with AI. Social, display, video — all from a single canvas.',
    heroBtn: 'Get Started Free', heroBtn2: 'Explore Features',
    bentoLabel: 'Platform',
    bentoTitle: 'Everything you need.', bentoTitle2: 'Nothing you don\'t.',
    bentoSub: 'A complete creative engine that replaces your entire tool stack.',
    feat1Label: 'Design Engine', feat1Title: 'GPU-Accelerated Canvas',
    feat1Desc: '60fps rendering engine for complex multi-layer compositions with real-time animations and effects.',
    feat2Label: 'AI Agent', feat2Title: 'Creative Co-Pilot',
    feat2Desc: 'Generate layouts, swap colors, add elements through natural conversation.',
    feat3Label: 'Animation', feat3Title: 'Bring Creatives to Life',
    feat3Desc: 'Timeline-based presets with custom easing. Export as video, GIF, or HTML5.',
    feat4Label: 'Export', feat4Title: 'Production-Ready Output',
    feat4Desc: 'PNG, JPG, HTML5, GIF, MP4, JS Bundle. Every format your campaign needs, in one click.',
    sizingLabel: 'Smart Sizing', sizingTitle1: 'Design once.',
    sizingTitle2: 'Deploy everywhere.', sizingSub: 'One master design auto-adapts to every ad format instantly.',
    sizingMaster: 'Master Design',
    pricingTitle: 'Simple, Transparent Pricing', pricingSub: 'Start free. Scale when you are ready.',
    ctaTitle: 'Ready to create?',
    ctaSub: 'Start building production-ready creatives in minutes. No credit card required.',
    footerProduct: 'Product', footerCompany: 'Company',
    footerContact: 'Contact', footerSales: 'Sales',
} as const;

export type TKey = keyof typeof EN;
type LangMap = Record<TKey, string>;

const translations: Record<LandingLang, LangMap> = {
    en: EN,
    ko: {
        navFeatures: '기능', navSizing: '스마트 사이징', navPricing: '요금제',
        navSignIn: '로그인', navCta: '무료로 시작',
        heroBadge: 'AI 크리에이티브 플랫폼',
        heroTitle1: '하나의 디자인.', heroTitle2: '모든 사이즈. 즉시.',
        heroSub: '한 번 디자인하면 AI가 모든 포맷으로 리사이즈. 소셜, 디스플레이, 비디오 — 하나의 캔버스에서.',
        heroBtn: '무료로 시작하기', heroBtn2: '기능 살펴보기',
        bentoLabel: '플랫폼',
        bentoTitle: '필요한 모든 것.', bentoTitle2: '불필요한 건 없습니다.',
        bentoSub: '당신의 전체 툴 스택을 대체하는 완전한 크리에이티브 엔진.',
        feat1Label: '디자인 엔진', feat1Title: 'GPU 가속 캔버스',
        feat1Desc: '실시간 애니메이션과 이펙트가 포함된 복잡한 멀티 레이어 구성도 60fps로 렌더링.',
        feat2Label: 'AI 에이전트', feat2Title: '크리에이티브 코파일럿',
        feat2Desc: '자연어 대화로 레이아웃 생성, 색상 변경, 요소 추가가 가능합니다.',
        feat3Label: '애니메이션', feat3Title: '크리에이티브에 생명을',
        feat3Desc: '커스텀 이징이 포함된 타임라인 기반 프리셋. 비디오, GIF, HTML5로 내보내기.',
        feat4Label: '내보내기', feat4Title: '프로덕션 레디 출력',
        feat4Desc: 'PNG, JPG, HTML5, GIF, MP4, JS Bundle. 캠페인에 필요한 모든 포맷을 원클릭으로.',
        sizingLabel: '스마트 사이징', sizingTitle1: '한 번 디자인하고',
        sizingTitle2: '어디서나 배포하세요.', sizingSub: '하나의 마스터 디자인이 모든 광고 포맷에 자동 적용됩니다.',
        sizingMaster: '마스터 디자인',
        pricingTitle: '심플하고 투명한 요금제', pricingSub: '무료로 시작하세요. 준비되면 확장하세요.',
        ctaTitle: '만들 준비 되셨나요?',
        ctaSub: '몇 분 만에 프로덕션 레디 크리에이티브를 만들어 보세요. 신용카드 불필요.',
        footerProduct: '제품', footerCompany: '회사',
        footerContact: '문의', footerSales: '영업',
    },
    ja: {
        navFeatures: '機能', navSizing: 'スマートサイジング', navPricing: '料金',
        navSignIn: 'ログイン', navCta: '無料で始める',
        heroBadge: 'AIクリエイティブプラットフォーム',
        heroTitle1: 'ワンデザイン。', heroTitle2: '全サイズ、即座に。',
        heroSub: '一度デザインすれば、AIが全フォーマットにリサイズ。ソーシャル、ディスプレイ、動画 — 一つのキャンバスで。',
        heroBtn: '無料で始める', heroBtn2: '機能を見る',
        bentoLabel: 'プラットフォーム',
        bentoTitle: '必要なものすべて。', bentoTitle2: '不要なものは無し。',
        bentoSub: 'ツールスタック全体を置き換える完全なクリエイティブエンジン。',
        feat1Label: 'デザインエンジン', feat1Title: 'GPU高速キャンバス',
        feat1Desc: 'リアルタイムアニメーションとエフェクトで複雑なマルチレイヤー構成も60fpsレンダリング。',
        feat2Label: 'AIエージェント', feat2Title: 'クリエイティブ副操縦士',
        feat2Desc: '自然な会話でレイアウト生成、色変更、要素追加が可能。',
        feat3Label: 'アニメーション', feat3Title: 'クリエイティブに命を',
        feat3Desc: 'カスタムイージング付きタイムラインプリセット。ビデオ、GIF、HTML5でエクスポート。',
        feat4Label: 'エクスポート', feat4Title: '本番対応出力',
        feat4Desc: 'PNG、JPG、HTML5、GIF、MP4、JSバンドル。ワンクリックで全フォーマット。',
        sizingLabel: 'スマートサイジング', sizingTitle1: '一度デザインして',
        sizingTitle2: 'どこにでもデプロイ。', sizingSub: '1つのマスターデザインが全広告フォーマットに自動適応。',
        sizingMaster: 'マスターデザイン',
        pricingTitle: 'シンプルで透明な料金', pricingSub: '無料で開始。準備ができたらスケール。',
        ctaTitle: '作る準備はできましたか？',
        ctaSub: '数分でプロダクション対応のクリエイティブを作成。クレジットカード不要。',
        footerProduct: '製品', footerCompany: '会社',
        footerContact: 'お問い合わせ', footerSales: '営業',
    },
    zh: {
        navFeatures: '功能', navSizing: '智能尺寸', navPricing: '定价',
        navSignIn: '登录', navCta: '免费开始',
        heroBadge: 'AI创意平台',
        heroTitle1: '一个设计。', heroTitle2: '所有尺寸。即刻生成。',
        heroSub: '设计一次，AI自动适配所有格式。社交、展示、视频 — 一个画布搞定。',
        heroBtn: '免费开始', heroBtn2: '探索功能',
        bentoLabel: '平台',
        bentoTitle: '你需要的一切。', bentoTitle2: '没有多余的。',
        bentoSub: '一个完整的创意引擎，替代你的整个工具栈。',
        feat1Label: '设计引擎', feat1Title: 'GPU加速画布',
        feat1Desc: '实时动画和效果的复杂多层构图，60fps渲染。',
        feat2Label: 'AI助手', feat2Title: '创意副驾驶',
        feat2Desc: '通过自然对话生成布局、更换颜色、添加元素。',
        feat3Label: '动画', feat3Title: '让创意栩栩如生',
        feat3Desc: '带自定义缓动的时间轴预设。导出为视频、GIF或HTML5。',
        feat4Label: '导出', feat4Title: '生产就绪输出',
        feat4Desc: 'PNG、JPG、HTML5、GIF、MP4、JS包。一键获取所有格式。',
        sizingLabel: '智能尺寸', sizingTitle1: '设计一次，',
        sizingTitle2: '到处部署。', sizingSub: '一个主设计自动适配所有广告格式。',
        sizingMaster: '主设计',
        pricingTitle: '简单透明的定价', pricingSub: '免费开始。准备好了再扩展。',
        ctaTitle: '准备创造了吗？',
        ctaSub: '几分钟内构建生产就绪的创意。无需信用卡。',
        footerProduct: '产品', footerCompany: '公司',
        footerContact: '联系', footerSales: '销售',
    },
    es: {
        navFeatures: 'Funciones', navSizing: 'Tamaño Inteligente', navPricing: 'Precios',
        navSignIn: 'Iniciar Sesión', navCta: 'Empieza Gratis',
        heroBadge: 'Plataforma Creativa IA',
        heroTitle1: 'Un Diseño.', heroTitle2: 'Todos los Tamaños. Al Instante.',
        heroSub: 'Diseña una vez, redimensiona a todos los formatos con IA. Social, display, video — desde un solo canvas.',
        heroBtn: 'Empieza Gratis', heroBtn2: 'Explorar Funciones',
        bentoLabel: 'Plataforma',
        bentoTitle: 'Todo lo que necesitas.', bentoTitle2: 'Nada que no.',
        bentoSub: 'Un motor creativo completo que reemplaza toda tu pila de herramientas.',
        feat1Label: 'Motor de Diseño', feat1Title: 'Canvas Acelerado por GPU',
        feat1Desc: 'Motor de renderizado a 60fps para composiciones multicapa complejas con animaciones en tiempo real.',
        feat2Label: 'Agente IA', feat2Title: 'Co-Piloto Creativo',
        feat2Desc: 'Genera diseños, cambia colores, añade elementos mediante conversación natural.',
        feat3Label: 'Animación', feat3Title: 'Da Vida a tus Creativos',
        feat3Desc: 'Presets basados en timeline con easing personalizado. Exporta como vídeo, GIF o HTML5.',
        feat4Label: 'Exportar', feat4Title: 'Salida Lista para Producción',
        feat4Desc: 'PNG, JPG, HTML5, GIF, MP4, JS Bundle. Cada formato que tu campaña necesita, en un clic.',
        sizingLabel: 'Tamaño Inteligente', sizingTitle1: 'Diseña una vez.',
        sizingTitle2: 'Despliega en todas partes.', sizingSub: 'Un diseño maestro se adapta automáticamente a cada formato publicitario.',
        sizingMaster: 'Diseño Maestro',
        pricingTitle: 'Precios Simples y Transparentes', pricingSub: 'Empieza gratis. Escala cuando estés listo.',
        ctaTitle: '¿Listo para crear?',
        ctaSub: 'Empieza a crear creativos listos para producción en minutos. Sin tarjeta de crédito.',
        footerProduct: 'Producto', footerCompany: 'Empresa',
        footerContact: 'Contacto', footerSales: 'Ventas',
    },
    fr: {
        navFeatures: 'Fonctionnalités', navSizing: 'Taille Intelligente', navPricing: 'Tarifs',
        navSignIn: 'Connexion', navCta: 'Commencer Gratuitement',
        heroBadge: 'Plateforme Créative IA',
        heroTitle1: 'Un Design.', heroTitle2: 'Toutes les Tailles. Instantanément.',
        heroSub: 'Concevez une fois, redimensionnez à tous les formats avec l\'IA. Social, display, vidéo — un seul canvas.',
        heroBtn: 'Commencer Gratuitement', heroBtn2: 'Découvrir les Fonctionnalités',
        bentoLabel: 'Plateforme',
        bentoTitle: 'Tout ce dont vous avez besoin.', bentoTitle2: 'Rien de superflu.',
        bentoSub: 'Un moteur créatif complet qui remplace toute votre pile d\'outils.',
        feat1Label: 'Moteur de Design', feat1Title: 'Canvas Accéléré GPU',
        feat1Desc: 'Moteur de rendu 60fps pour des compositions multicouches complexes avec animations en temps réel.',
        feat2Label: 'Agent IA', feat2Title: 'Co-Pilote Créatif',
        feat2Desc: 'Générez des mises en page, changez les couleurs, ajoutez des éléments par conversation naturelle.',
        feat3Label: 'Animation', feat3Title: 'Donnez Vie à vos Créatifs',
        feat3Desc: 'Préréglages timeline avec easing personnalisé. Exportez en vidéo, GIF ou HTML5.',
        feat4Label: 'Export', feat4Title: 'Sortie Prête pour la Production',
        feat4Desc: 'PNG, JPG, HTML5, GIF, MP4, JS Bundle. Chaque format dont votre campagne a besoin.',
        sizingLabel: 'Taille Intelligente', sizingTitle1: 'Concevez une fois.',
        sizingTitle2: 'Déployez partout.', sizingSub: 'Un design maître s\'adapte automatiquement à chaque format publicitaire.',
        sizingMaster: 'Design Maître',
        pricingTitle: 'Tarification Simple et Transparente', pricingSub: 'Commencez gratuitement. Évoluez quand vous êtes prêt.',
        ctaTitle: 'Prêt à créer ?',
        ctaSub: 'Créez des visuels prêts pour la production en quelques minutes. Sans carte de crédit.',
        footerProduct: 'Produit', footerCompany: 'Entreprise',
        footerContact: 'Contact', footerSales: 'Ventes',
    },
    de: {
        navFeatures: 'Funktionen', navSizing: 'Smart Sizing', navPricing: 'Preise',
        navSignIn: 'Anmelden', navCta: 'Kostenlos Starten',
        heroBadge: 'AI Kreativ-Plattform',
        heroTitle1: 'Ein Design.', heroTitle2: 'Alle Größen. Sofort.',
        heroSub: 'Einmal designen, KI skaliert auf alle Formate. Social, Display, Video — alles auf einer Leinwand.',
        heroBtn: 'Kostenlos Starten', heroBtn2: 'Funktionen Entdecken',
        bentoLabel: 'Plattform',
        bentoTitle: 'Alles was du brauchst.', bentoTitle2: 'Nichts, was du nicht brauchst.',
        bentoSub: 'Eine vollständige Kreativ-Engine, die deinen gesamten Tool-Stack ersetzt.',
        feat1Label: 'Design-Engine', feat1Title: 'GPU-beschleunigte Leinwand',
        feat1Desc: '60fps-Rendering-Engine für komplexe Multilayer-Kompositionen mit Echtzeit-Animationen.',
        feat2Label: 'KI-Agent', feat2Title: 'Kreativer Co-Pilot',
        feat2Desc: 'Layouts generieren, Farben wechseln, Elemente hinzufügen durch natürliche Konversation.',
        feat3Label: 'Animation', feat3Title: 'Erwecke Kreatives zum Leben',
        feat3Desc: 'Timeline-basierte Presets mit benutzerdefiniertem Easing. Export als Video, GIF oder HTML5.',
        feat4Label: 'Export', feat4Title: 'Produktionsbereite Ausgabe',
        feat4Desc: 'PNG, JPG, HTML5, GIF, MP4, JS Bundle. Jedes Format das deine Kampagne braucht.',
        sizingLabel: 'Smart Sizing', sizingTitle1: 'Einmal designen.',
        sizingTitle2: 'Überall deployen.', sizingSub: 'Ein Master-Design passt sich automatisch an jedes Werbeformat an.',
        sizingMaster: 'Master-Design',
        pricingTitle: 'Einfache, Transparente Preise', pricingSub: 'Kostenlos starten. Skalieren wenn du bereit bist.',
        ctaTitle: 'Bereit zu erstellen?',
        ctaSub: 'Erstelle produktionsbereite Creatives in Minuten. Keine Kreditkarte nötig.',
        footerProduct: 'Produkt', footerCompany: 'Unternehmen',
        footerContact: 'Kontakt', footerSales: 'Vertrieb',
    },
    pt: {
        navFeatures: 'Recursos', navSizing: 'Tamanho Inteligente', navPricing: 'Preços',
        navSignIn: 'Entrar', navCta: 'Comece Grátis',
        heroBadge: 'Plataforma Criativa IA',
        heroTitle1: 'Um Design.', heroTitle2: 'Todos os Tamanhos. Instantamente.',
        heroSub: 'Design uma vez, IA redimensiona para todos os formatos. Social, display, vídeo — um único canvas.',
        heroBtn: 'Comece Grátis', heroBtn2: 'Explorar Recursos',
        bentoLabel: 'Plataforma',
        bentoTitle: 'Tudo o que você precisa.', bentoTitle2: 'Nada que não precise.',
        bentoSub: 'Um motor criativo completo que substitui toda a sua pilha de ferramentas.',
        feat1Label: 'Motor de Design', feat1Title: 'Canvas Acelerado por GPU',
        feat1Desc: 'Motor de renderização 60fps para composições multicamada complexas com animações em tempo real.',
        feat2Label: 'Agente IA', feat2Title: 'Co-Piloto Criativo',
        feat2Desc: 'Gere layouts, troque cores, adicione elementos através de conversa natural.',
        feat3Label: 'Animação', feat3Title: 'Dê Vida aos Criativos',
        feat3Desc: 'Presets baseados em timeline com easing personalizado. Exporte como vídeo, GIF ou HTML5.',
        feat4Label: 'Exportar', feat4Title: 'Saída Pronta para Produção',
        feat4Desc: 'PNG, JPG, HTML5, GIF, MP4, JS Bundle. Cada formato que sua campanha precisa.',
        sizingLabel: 'Tamanho Inteligente', sizingTitle1: 'Design uma vez.',
        sizingTitle2: 'Publique em todo lugar.', sizingSub: 'Um design mestre se adapta automaticamente a cada formato de anúncio.',
        sizingMaster: 'Design Mestre',
        pricingTitle: 'Preços Simples e Transparentes', pricingSub: 'Comece grátis. Escale quando estiver pronto.',
        ctaTitle: 'Pronto para criar?',
        ctaSub: 'Crie criativos prontos para produção em minutos. Sem cartão de crédito.',
        footerProduct: 'Produto', footerCompany: 'Empresa',
        footerContact: 'Contato', footerSales: 'Vendas',
    },
    it: {
        navFeatures: 'Funzionalità', navSizing: 'Smart Sizing', navPricing: 'Prezzi',
        navSignIn: 'Accedi', navCta: 'Inizia Gratis',
        heroBadge: 'Piattaforma Creativa IA',
        heroTitle1: 'Un Design.', heroTitle2: 'Tutte le Dimensioni. Istantaneamente.',
        heroSub: 'Progetta una volta, l\'IA ridimensiona per tutti i formati. Social, display, video — un solo canvas.',
        heroBtn: 'Inizia Gratis', heroBtn2: 'Esplora Funzionalità',
        bentoLabel: 'Piattaforma',
        bentoTitle: 'Tutto ciò che ti serve.', bentoTitle2: 'Niente di superfluo.',
        bentoSub: 'Un motore creativo completo che sostituisce l\'intero stack di strumenti.',
        feat1Label: 'Motore Design', feat1Title: 'Canvas Accelerato GPU',
        feat1Desc: 'Motore di rendering a 60fps per composizioni multistrato complesse con animazioni in tempo reale.',
        feat2Label: 'Agente IA', feat2Title: 'Co-Pilota Creativo',
        feat2Desc: 'Genera layout, cambia colori, aggiungi elementi tramite conversazione naturale.',
        feat3Label: 'Animazione', feat3Title: 'Dai Vita ai Creativi',
        feat3Desc: 'Preset basati su timeline con easing personalizzato. Esporta come video, GIF o HTML5.',
        feat4Label: 'Esporta', feat4Title: 'Output Pronto per la Produzione',
        feat4Desc: 'PNG, JPG, HTML5, GIF, MP4, JS Bundle. Ogni formato di cui la tua campagna ha bisogno.',
        sizingLabel: 'Smart Sizing', sizingTitle1: 'Progetta una volta.',
        sizingTitle2: 'Distribuisci ovunque.', sizingSub: 'Un design master si adatta automaticamente a ogni formato pubblicitario.',
        sizingMaster: 'Design Master',
        pricingTitle: 'Prezzi Semplici e Trasparenti', pricingSub: 'Inizia gratis. Scala quando sei pronto.',
        ctaTitle: 'Pronto a creare?',
        ctaSub: 'Crea creativi pronti per la produzione in pochi minuti. Nessuna carta di credito.',
        footerProduct: 'Prodotto', footerCompany: 'Azienda',
        footerContact: 'Contatto', footerSales: 'Vendite',
    },
    th: {
        navFeatures: 'คุณสมบัติ', navSizing: 'ปรับขนาดอัจฉริยะ', navPricing: 'ราคา',
        navSignIn: 'เข้าสู่ระบบ', navCta: 'เริ่มใช้ฟรี',
        heroBadge: 'แพลตฟอร์มครีเอทีฟ AI',
        heroTitle1: 'ดีไซน์เดียว', heroTitle2: 'ทุกขนาด ทันที',
        heroSub: 'ออกแบบครั้งเดียว AI ปรับขนาดให้ทุกรูปแบบ โซเชียล ดิสเพลย์ วิดีโอ — จากแคนวาสเดียว',
        heroBtn: 'เริ่มใช้ฟรี', heroBtn2: 'สำรวจคุณสมบัติ',
        bentoLabel: 'แพลตฟอร์ม',
        bentoTitle: 'ทุกอย่างที่คุณต้องการ', bentoTitle2: 'ไม่มีสิ่งที่ไม่จำเป็น',
        bentoSub: 'เอ็นจิ้นครีเอทีฟที่สมบูรณ์ ทดแทนเครื่องมือทั้งหมดของคุณ',
        feat1Label: 'เอ็นจิ้นออกแบบ', feat1Title: 'แคนวาส GPU เร่งความเร็ว',
        feat1Desc: 'เอ็นจิ้นเรนเดอร์ 60fps สำหรับงานหลายเลเยอร์ที่ซับซ้อนพร้อมอนิเมชันแบบเรียลไทม์',
        feat2Label: 'เอเจนต์ AI', feat2Title: 'ผู้ช่วยครีเอทีฟ',
        feat2Desc: 'สร้างเลย์เอาต์ เปลี่ยนสี เพิ่มองค์ประกอบผ่านการสนทนาตามธรรมชาติ',
        feat3Label: 'อนิเมชัน', feat3Title: 'ทำให้ครีเอทีฟมีชีวิต',
        feat3Desc: 'พรีเซ็ตไทม์ไลน์พร้อมอีซิ่งที่กำหนดเอง ส่งออกเป็นวิดีโอ GIF หรือ HTML5',
        feat4Label: 'ส่งออก', feat4Title: 'เอาต์พุตพร้อมใช้งาน',
        feat4Desc: 'PNG, JPG, HTML5, GIF, MP4, JS Bundle ทุกรูปแบบที่แคมเปญต้องการ',
        sizingLabel: 'ปรับขนาดอัจฉริยะ', sizingTitle1: 'ออกแบบครั้งเดียว',
        sizingTitle2: 'เผยแพร่ทุกที่', sizingSub: 'ดีไซน์มาสเตอร์หนึ่งชิ้นปรับสู่ทุกรูปแบบโฆษณาอัตโนมัติ',
        sizingMaster: 'ดีไซน์มาสเตอร์',
        pricingTitle: 'ราคาที่เรียบง่ายและโปร่งใส', pricingSub: 'เริ่มฟรี ขยายเมื่อพร้อม',
        ctaTitle: 'พร้อมที่จะสร้างหรือยัง?',
        ctaSub: 'เริ่มสร้างครีเอทีฟที่พร้อมใช้งานจริงในไม่กี่นาที ไม่ต้องใช้บัตรเครดิต',
        footerProduct: 'ผลิตภัณฑ์', footerCompany: 'บริษัท',
        footerContact: 'ติดต่อ', footerSales: 'ฝ่ายขาย',
    },
};

// ── Context ──
interface LandingI18nCtx {
    lang: LandingLang;
    setLang: (l: LandingLang) => void;
    t: (key: TKey) => string;
}

const Ctx = createContext<LandingI18nCtx>({
    lang: 'en',
    setLang: () => {},
    t: (k) => k,
});

export function useLandingI18n() {
    return useContext(Ctx);
}

const STORAGE_KEY = 'glid-landing-lang';

export function LandingI18nProvider({ children }: { children: ReactNode }) {
    const [lang, setLangState] = useState<LandingLang>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored && stored in translations) return stored as LandingLang;
        } catch { /* */ }
        // Auto-detect from browser
        const browserLang = navigator.language.split('-')[0] ?? '';
        if (browserLang && browserLang in translations) return browserLang as LandingLang;
        return 'en';
    });

    const setLang = useCallback((l: LandingLang) => {
        setLangState(l);
        try { localStorage.setItem(STORAGE_KEY, l); } catch { /* */ }
    }, []);

    const t = useCallback((key: TKey): string => {
        return translations[lang]?.[key] ?? translations.en[key] ?? key;
    }, [lang]);

    return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}
