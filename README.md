# 성진 · 서린 모바일 청첩장

로컬 프로젝트: `/Users/seolin/Documents/seolin/code/wedding`
GitHub Pages 주소: https://linttobom.github.io/wedding/

## 이미지 관리

`images/` 폴더에서 직접 관리합니다. 원본 사진은 압축하지 않고 보존했습니다.

- `hero.png`: 첫 화면 사진
- `greeting.png`: 인사말 사진 및 공유 미리보기
- `attendance.png`: 하단 배경 사진
- `map.png`: 지도 이미지
- `gallery/`: 갤러리 사진. `01.png`, `02.jpg`, `03.webp`처럼 숫자순 파일명으로 관리합니다. PNG/JPG/JPEG/WebP/AVIF를 지원합니다.

메인 사진은 같은 파일명으로 교체합니다. 갤러리는 파일을 추가하거나 삭제하면 다음 빌드 때 자동 반영됩니다. 현재 사진 18장을 모두 표시하며 더보기·접기 버튼은 사용하지 않습니다.

로컬에서 수정한 뒤 GitHub에 커밋하고 푸시하면 Actions가 다시 배포합니다. GitHub 웹에서도 `images` 폴더에서 파일 업로드·삭제 후 커밋할 수 있습니다. 로컬 변경만으로 공개 사이트가 변경되지는 않습니다.

원본 아이콘과 제목 SVG는 `public/icons/`, Pretendard 폰트와 라이선스는 `public/fonts/`에 있습니다. Optima 제목은 원본 글자 모양을 SVG로 보존했습니다.

### 사진·폰트 용량 최적화

`npm run dev`와 `npm run build`는 원본을 보존하고 아래의 웹용 파일을 자동 생성합니다. 생성된 `images/optimized/`, `src/generated/`, `dist/`는 직접 수정하거나 GitHub에 올리지 않습니다.

- 메인 사진: 최대 너비 1320px WebP. 화면 최대 너비 440px의 3배 해상도입니다.
- 갤러리 확대 사진: 긴 변 최대 2400px WebP. 목록은 별도 480px 정사각형 썸네일을 사용합니다.
- 공유 미리보기: `images/optimized/share.jpg`를 `dist/images/share.jpg`로 내보냅니다. 카카오톡과 Open Graph는 이 JPEG를 사용합니다.
- 폰트: `src/`의 화면 문구와 영문·숫자에 필요한 글자만 WOFF2로 만듭니다. 화면 문구를 수정하면 다음 실행·빌드 때 자동으로 갱신됩니다. 원본 Pretendard·NanumPen 파일은 로컬에 보존하고 배포 결과에는 작은 폰트와 라이선스만 포함합니다.

2026-11-01 기준으로 이전 최적화 설정과 비교하면, 웹용 사진 3장·확대 사진 18장·썸네일 18장의 합계는 약 6.80MB에서 3.51MB로 줄었습니다. 별도 공유 이미지는 원본 PNG 약 3.79MB 대신 JPEG 약 52KB를 사용합니다. 원본 사진의 해상도와 파일 내용은 유지합니다.

## 실행

Node.js 22.13 이상 권장.

```sh
npm ci
npm run dev
npm run build
npm run preview
```

수정 후 `npm run test:maps`, `npm run test:media`, `npm run test:security`로 지도 링크, 음악·영상 제어, 보안 차단 규칙을 검사합니다. `npm run build` 다음 `npm run security:check`를 실행하면 의존성 취약점과 배포 파일의 인증 정보·금융정보·보안 설정을 검사합니다. GitHub 배포에서도 같은 검사를 수행합니다. 카카오톡 공유는 기존 저장소 변수 `VITE_KAKAO_JAVASCRIPT_KEY`를 사용합니다.

배포 결과에는 외부 스크립트·폼 경로를 제한하는 CSP가 적용됩니다. 로컬 `npm run dev`에서는 Vite의 화면 갱신 스크립트를 위해 CSP를 제거하며, `npm run preview`는 실제 배포 보안 정책을 유지합니다.

## 기타 수정

본문: `src/App.tsx`
계좌 항목 구조: `src/accounts.ts`
공개 계좌정보: `src/accounts.public.json`
사용자가 청첩장 공개를 승인한 신랑측·신부측 각 3개 계좌를 GitHub와 실제 사이트에 포함합니다. 화면과 복사 버튼은 동일한 데이터를 사용합니다. 보안 검사는 이 6개 공개 계좌에 한해 허용하며, 승인되지 않은 금융정보와 인증정보는 계속 차단합니다. 이전 `src/accounts.local.json`은 로컬 보관본으로 유지하고 사이트에서는 불러오지 않습니다.
스타일: `src/style.css`
공유 미리보기: `index.html`
배포 설정: `.github/workflows/pages.yml`

사진·아이콘에 대한 공개 이용 라이선스를 부여하지 않습니다.

## 2026-10-11 디자인 미리보기

첫 화면은 뷰포트 높이, 3초 인트로 뒤 꽃잎 효과를 적용합니다. 음악은 `audio/music.mp3`를 넣으면 연결됩니다.

음악: 사용자가 제공한 「우산나무 아래, 우리 (Inst.)」를 `audio/music.mp3`에 복사했습니다. 갤러리 위 영상은 YouTube frXorvk8V_g의 수동 재생 플레이어입니다. 갤러리 좌측 버튼은 이전 장, 우측 버튼은 다음 장이며 처음/끝에서 순환하지 않습니다. 활성 아이콘 #fff, 비활성 #ccc.

배경음악은 기존의 50% 음량으로 재생합니다. 영상을 처음 누르면 음악이 OFF로 바뀌고, 음악 버튼을 다시 누르기 전까지 재개하지 않습니다. 유튜브 코드는 별도 도메인의 영상 프레임 안에서만 실행하며 본문에 제어용 스크립트를 불러오지 않습니다. 브라우저의 자동 재생 제한에 따라 첫 클릭 후 영상의 재생 버튼을 한 번 더 눌러야 할 수 있습니다.

꽃잎은 흰색(#fff)입니다. 첫 사진은 좌측, 마지막 사진은 우측 버튼이 비활성화됩니다.

## 갤러리 교체 (2026-10-11)
데스크탑 「오누포토 수정본」의 001~018 사진을 `images/gallery/01.jpeg`~`18.jpeg`에 원본 그대로 복사했습니다. 현재는 18장 모두 표시합니다. 이전 사진은 `images/gallery-backups/`에 보존합니다.
