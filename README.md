# 🗺️ Isometric Map Editor & Viewer

디아블로2 스타일의 3D 아이소메트릭 맵 에디터 & 뷰어입니다.

Three.js와 React Three Fiber를 사용하여 실시간 3D 렌더링을 구현했습니다.

## 🚀 시작하기

### 설치

```bash
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 을 엽니다.

### 빌드

```bash
npm run build
npm start
```

## 📁 프로젝트 구조

```
iso-map-editor/
├── app/
│   ├── page.tsx          # 메인 페이지 (에디터)
│   ├── viewer/
│   │   └── page.tsx      # 뷰어 페이지
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── MapEditor.tsx     # 맵 에디터 컴포넌트
│   ├── MapViewer.tsx     # 맵 뷰어 컴포넌트
│   └── types.ts          # TypeScript 타입 정의
├── package.json
└── README.md
```

## 🎮 사용법

### 맵 에디터 (/)

#### 기본 조작
- **좌클릭**: 블록 배치
- **우클릭 드래그**: 뷰 회전
- **스크롤**: 줌 인/아웃
- **Middle 클릭 드래그**: 팬 (이동)

#### 기능
1. **Grid Size**: 맵 크기 조절 (5x5 ~ 50x50)
2. **Tools**: 
   - Place Mode: 블록 배치 모드
   - Erase Mode: 블록 삭제 모드
   - Clear Map: 맵 전체 초기화
3. **Rotation**: 블록 회전 각도 선택 (0°, 90°, 180°, 270°)
4. **Blocks**: 블록 타입 선택
   - Brown Block (갈색)
   - Stone Block (회색)
   - Grass Block (초록)
   - Sand Block (모래색)
5. **File**: 
   - Save Map: JSON 파일로 저장
   - Load Map: JSON 파일 불러오기

### 맵 뷰어 (/viewer)

#### 기본 조작
- **좌클릭 드래그**: 뷰 회전
- **우클릭 드래그**: 팬 (이동)
- **스크롤**: 줌 인/아웃

#### 기능
1. **Load Map**: 에디터에서 저장한 JSON 파일 불러오기
2. **Zoom In/Out**: 줌 조절
3. **Auto Rotate**: 자동 회전 모드
4. **Minimap**: 우측 하단 미니맵으로 전체 맵 확인

## 💾 JSON 맵 데이터 구조

```typescript
{
  "version": "1.0",
  "gridWidth": 20,
  "gridHeight": 20,
  "blocks": [
    {
      "id": "block_id",
      "name": "Block Name",
      "color": "#8B4513"
    }
  ],
  "map": [
    [
      null,
      { "blockIndex": 0, "rotation": 0 },
      { "blockIndex": 1, "rotation": 90 }
    ]
  ]
}
```

### 필드 설명
- `version`: 맵 데이터 버전
- `gridWidth`, `gridHeight`: 맵 그리드 크기
- `blocks`: 사용 가능한 블록 목록
  - `id`: 고유 식별자
  - `name`: 블록 이름
  - `color`: 블록 색상 (hex)
- `map`: 2D 배열 형태의 맵 데이터
  - `null`: 빈 타일
  - `blockIndex`: blocks 배열의 인덱스
  - `rotation`: 회전 각도

## 🎨 기술 스택

- **Next.js 14** - React 프레임워크
- **TypeScript** - 타입 안정성
- **Three.js** - 3D 렌더링 엔진
- **React Three Fiber** - React용 Three.js 렌더러
- **@react-three/drei** - Three.js 헬퍼 컴포넌트
- **Tailwind CSS** - 스타일링

## 🔧 주요 기능

### 3D 렌더링
- 실시간 3D 큐브 블록 렌더링
- 아이소메트릭 뷰 지원
- 그림자 및 조명 효과
- 부드러운 카메라 컨트롤

### 에디터
- 직관적인 블록 배치/삭제
- 그리드 기반 맵 시스템
- 블록 회전 기능
- 실시간 프리뷰

### 뷰어
- 맵 탐색 모드
- 자동 회전 기능
- 미니맵 표시
- 줌 컨트롤

## 📝 워크플로우

1. **에디터 열기** (http://localhost:3000)
2. 원하는 블록 선택
3. 그리드에 클릭하여 블록 배치
4. "Save Map" 버튼으로 JSON 저장
5. 우측 상단 "Open Viewer" 클릭
6. "Load Map" 버튼으로 저장한 맵 불러오기
7. 맵 탐색 시작!

## 🎯 향후 개선 사항

- [ ] 커스텀 블록 이미지 업로드
- [ ] 멀티 레이어 지원 (높이 레벨)
- [ ] 블록 텍스처 지원
- [ ] 언두/리두 기능
- [ ] 맵 템플릿 시스템
- [ ] 블록 복사/붙여넣기

## 📄 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능합니다.

---

**Made with ❤️ using Three.js & Next.js**
