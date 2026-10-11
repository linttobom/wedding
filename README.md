# 성진 · 서린 모바일 청첩장

로컬 프로젝트: `/Users/seolin/Documents/seolin/code/wedding`
GitHub Pages 주소: https://linttobom.github.io/wedding/

## 이미지 관리

`images/` 폴더에서 직접 관리합니다. 원본 사진은 압축하지 않고 보존했습니다.

- `hero.png`: 첫 화면 사진
- `greeting.png`: 인사말 사진 및 공유 미리보기
- `attendance.png`: 참석 의사 섹션 사진
- `map.png`: 지도 이미지
- `gallery/`: 갤러리 사진. `01.png`, `02.jpg`, `03.webp`처럼 숫자순 파일명으로 관리합니다. PNG/JPG/JPEG/WebP/AVIF를 지원합니다.

메인 사진은 같은 파일명으로 교체합니다. 갤러리는 파일을 추가하거나 삭제하면 다음 빌드 때 자동 반영됩니다. 첫 12장이 먼저 표시되고 나머지는 더보기로 열립니다. 12장 이하이면 더보기 버튼은 숨겨집니다.

로컬에서 수정한 뒤 GitHub에 커밋하고 푸시하면 Actions가 다시 배포합니다. GitHub 웹에서도 `images` 폴더에서 파일 업로드·삭제 후 커밋할 수 있습니다. 로컬 변경만으로 공개 사이트가 변경되지는 않습니다.

원본 아이콘과 제목 SVG는 `public/icons/`, Pretendard 폰트와 라이선스는 `public/fonts/`에 있습니다. Optima 제목은 원본 글자 모양을 SVG로 보존했습니다.

## 실행

Node.js 22.13 이상 권장.

```sh
npm ci
npm run dev
npm run build
npm run preview
```

## 참가 응답 저장

GitHub Pages는 정적 호스팅이므로 서버 API를 실행하지 않습니다. 참석 의사 버튼은 기존 Sites의 입력 화면으로 연결합니다. 실제 답변은 기존 Sites의 데이터베이스에 저장됩니다. Sites를 삭제하면 이 저장 기능도 사용할 수 없습니다. 연결 주소는 `src/config.ts`에서 변경합니다. 독립 운영하려면 별도 폼 또는 서버로 교체해야 합니다.

`sites-backend/`는 기존 Sites 서버 코드 보관본이며 GitHub 업로드 대상에서 제외됩니다. 기존 Sites의 공개 서비스는 유지됩니다.

## 기타 수정

본문과 계좌번호: `src/App.tsx` (현재 계좌번호는 시안의 예시입니다.)
스타일: `src/style.css`
공유 미리보기: `index.html`
배포 설정: `.github/workflows/pages.yml`

사진·아이콘에 대한 공개 이용 라이선스를 부여하지 않습니다.

## 2026-10-11 디자인 미리보기

첫 화면은 뷰포트 높이, 3초 인트로 뒤 꽃잎 효과를 적용합니다. 음악은 `audio/music.mp3`를 넣으면 연결됩니다. 갤러리는 처음 9장, 더보기/접기로 전체 사진을 관리합니다. 참석 의사 팝업은 필수 입력 검증을 제공하며, 현재 디자인 미리보기에서 응답을 전송하거나 저장하지 않습니다. 실제 저장 연결은 배포 전에 기존 서버와 연결해 확인해야 합니다.

음악: 사용자가 제공한 「우산나무 아래, 우리 (Inst.)」를 `audio/music.mp3`에 복사했습니다. 갤러리 위 영상은 YouTube frXorvk8V_g의 수동 재생 플레이어입니다. 갤러리 좌측 버튼은 이전 장, 우측 버튼은 다음 장이며 처음/끝에서 순환하지 않습니다. 활성 아이콘 #fff, 비활성 #ccc.

꽃잎은 흰색(#fff)입니다. 첫 사진은 좌측, 마지막 사진은 우측 버튼이 비활성화됩니다.

## 갤러리 교체 (2026-10-11)
데스크탑 「오누포토 수정본」의 001~018 사진을 `images/gallery/01.jpeg`~`18.jpeg`에 원본 그대로 복사했습니다. 최초 12장, 더보기로 전체 18장입니다. 이전 사진은 `images/gallery-backups/`에 보존합니다.
