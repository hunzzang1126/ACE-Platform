# Wasm Layout Engine (Rust)

향후 Rust → WebAssembly로 컴파일되는 고성능 레이아웃 엔진이 이 폴더에 구현됩니다.

## 목적
- `resolveConstraints()` 함수의 고성능 Wasm 대체
- 수백 개의 배너에 대한 실시간 좌표 계산
- 텍스트 바운딩 박스 계산 (ICU 라이브러리 연동)

## 현재 상태
`src/schema/constraints.types.ts`에 순수 TypeScript로 구현됨.
성능 병목이 확인되면 Wasm으로 교체 예정.
