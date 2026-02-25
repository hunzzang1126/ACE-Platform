---
trigger: always_on
---

🛠️ ACE Project: AI Coding Rules & Guidelines
1. General Principles & Architecture
Module-First Approach: 모든 기능은 독립적인 모듈로 분리한다. 특정 기능을 수정할 때 다른 모듈에 영향을 주지 않도록 한다.

Orchestrator Pattern: main.py나 App.tsx 같은 진입점은 오직 모듈들을 실행하고 연결하는 '지휘자' 역할만 수행한다. 실제 비즈니스 로직이나 복잡한 계산은 반드시 전용 Hook이나 Service 모듈에 위치시킨다.

English-Only UI/UX: 북미 시장이 타겟이므로, 소스 코드 내의 모든 UI 텍스트, 플레이스홀더, 알림 메시지는 **반드시 영어(English)**로 작성한다. (주석은 개발 편의를 위해 한국어 허용).

2. Frontend & Rendering Rules (PixiJS + React)
Hook-Driven Logic: 모든 상태 변화와 사이드 이펙트는 React Hooks(useCanvas, useBannerSync, useAIAgent)로 관리한다. 컴포넌트 내부에는 UI 마크업만 남긴다.

Atomic CSS (Tailwind): app.css에는 글로벌 테마와 변수만 정의하고, 스타일링은 Tailwind CSS를 기본으로 사용한다. CSS 클래스 명명 규칙으로 고민하는 시간을 최소화한다.

High-Performance Rendering: * PixiJS 객체는 React State에 직접 담지 않는다 (성능 저하 방지).

Ref를 통해 캔버스 엔진에 접근하고, 데이터 동기화는 Zustand 또는 Pub/Sub 모델을 사용한다.

3. AI Agent & Data Contract
JSON-Centric Design: 모든 디자인 상태는 직렬화 가능한 JSON 구조로 유지한다. 이는 AI(Claude 4.6)가 디자인을 '읽고 쓸 수 있는' 유일한 통로다.

Atomic Functions for AI: AI 에이전트가 호출할 함수(Tool Use)는 최대한 작고 명확하게 만든다.

예: updateElementColor(id, color) (O) / makeDesignBetter() (X)

Vision Feedback Loop: 모든 리사이징 작업 후에는 반드시 스크린샷 캡처 및 Vision API(GPT-4o) 검증 단계를 거치도록 로직을 설계한다.

4. Technical Efficiency (시행착오 방지 룰)
Zod Schema Validation: 모든 데이터 피드와 디자인 JSON은 Zod를 사용하여 런타임에 타입을 검증한다. 잘못된 데이터가 엔진을 망가뜨리는 것을 방지한다.

Early Return & Error Handling: 모든 함수는 예외 상황을 먼저 처리(Early Return)하고, 사용자에게 보여줄 에러 메시지는 친절한 영어 문장으로 작성한다.

Wasm Bridge: 복잡한 레이아웃 계산(Constraint-based)은 Rust로 작성된 Wasm 모듈을 호출하며, 이 브릿지 코드는 useLayoutEngine 훅 하나로 캡슐화한다.

# ACE Project Rules (North America Target)

1. **Role Separation**: Strictly follow the Single Responsibility Principle. A file can have 300-600 lines ONLY IF it serves a single, cohesive purpose. Mixing UI, API, and Canvas logic in one file is strictly prohibited.
2. **Modular Hooks**: Extract all logic into Custom Hooks. Components must remain "thin" and focus on rendering.
3. **Language**: The entire UI must be in English. No Korean text in the production code.
4. **Project Structure**:
   - `main.py` / `App.tsx`: Entry points only.
   - `/components`: Pure UI elements.
   - `/hooks`: Business logic and state orchestration.
   - `/engines`: PixiJS & Canvas manipulation.
   - `/schemas`: Zod or Type definitions.
5. **AI Integration**: Design interactions as JSON-based tools. Every AI-driven layout change must be verifiable via vision-check logic.


📝 안티그레비티/에디터에 바로 붙여넣을 요약본 (영문 포함)
이 요약본은 클로드 4.6이 읽었을 때 가장 잘 알아듣는 형태입니다.

[Project Rules: ACE Engine]

UI Language: All User Interface elements, labels, and messages must be in English (Target: North America).

Modular Entry: Entry points (e.g., main.py, App.tsx) must be lightweight. Use Hooks and Services for all logic.

State Management: Use Zustand for global state. Canvas-specific objects must be managed outside of React state for performance.

Styling: Use Tailwind CSS. Keep app.css minimal (Global variables only).

Reliability: Implement Zod for schema validation. AI Agent must interact via predefined, atomic JSON-based tools.

Performance: Use PixiJS (WebGPU) for rendering. Use OffscreenCanvas for heavy background tasks.


