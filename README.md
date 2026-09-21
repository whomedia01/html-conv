# 교안 HTML 변환기 — 배포 안내

PPT·PDF 강의 교안을 **책장이 넘어가는 플립북 전자책 HTML**(또는 버튼 없는 순수 HTML)로 바꾸는 정적 웹사이트입니다. (나모오서 방식의 결과물을 저작도구 설치 없이 만듭니다.)
서버 프로그램이나 데이터베이스가 필요 없고, 파일은 사용자 브라우저 안에서만 처리됩니다.

## 폴더 구성

| 경로 | 내용 |
|---|---|
| `index.html` | 변환기 본체 (화면 + 변환 엔진 + 결과 뷰어 템플릿) |
| `vendor/pdfjs/` | PDF 렌더링 엔진 pdf.js 3.11.174, 한글 CMap, 표준 글꼴 |
| `vendor/jszip/` | PPTX 해석·ZIP 묶음용 JSZip 3.10.1 |
| `vendor/blob/` | 웹 링크 업로드용 Vercel Blob 클라이언트 (Apache-2.0) |
| `api/upload.js`, `api/book.js` | 웹 링크 기능 서버 코드 (Vercel 함수) |
| `viewer.html` | `/b/링크ID` 주소로 접속하면 저장된 이북을 불러와 보여주는 화면 |
| `package.json`, `vercel.json` | Vercel 설정 (의존성, `/b/:id` 주소 연결, 캐시·보안 헤더) |

외부 CDN을 쓰지 않으므로 사내망이나 폐쇄망에서도 변환·HTML 저장이 동작합니다. (글꼴만 Google Fonts를 쓰며, 막혀 있으면 시스템 글꼴로 대체됩니다.)

## 배포 방법 (택 1)

### A. Vercel — 가장 간단
1. vercel.com 로그인 → **Add New › Project**
2. 이 폴더를 GitHub 저장소에 올린 뒤 Import (Framework Preset: **Other**, Build Command 비움)
3. 배포 후 **Settings › Domains**에서 `convert.후미디어도메인` 같은 하위 도메인 연결

### B. GitHub Pages
저장소 **Settings › Pages** → Branch `main` / 폴더 `/ (root)` 선택 → 저장

### C. 기존 웹호스팅(카페24 등)
FTP로 이 폴더 전체를 `www/convert/` 같은 하위 폴더에 올리면 `https://도메인/convert/`로 접속됩니다.

> 주의: `index.html`을 PC에서 더블클릭(file://)하면 PDF 엔진이 일부 기능을 쓰지 못합니다. 반드시 웹서버에 올려서 사용하세요.
> 로컬 확인은 이 폴더에서 `python -m http.server 8000` 실행 후 http://localhost:8000 접속.

## 결과물 형태

| 형태 | 내용 | 추천 상황 |
|---|---|---|
| **책장 넘김 이북 (플립북)** — 기본값 | 종이책처럼 모서리를 잡아 끌거나 화살표로 넘기는 3D 페이지 넘김, 표지(하드커버), 두 쪽 펼침(휴대폰은 한 쪽), 페이지 썸네일·목차, 정밀 확대/축소(100~400%: 버튼·슬라이더·Ctrl+휠·두 손가락, 확대 중 끌어서 이동), 전체화면. 차시당 HTML 1개, 인터넷 없이 실행 | 원청이 요구한 전자책(이북) 납품 |
| **내용만 (단순 HTML)** | 버튼·메뉴·스크립트 없이 교안 페이지만 위에서 아래로 담은 순수 HTML. 이미지 내장, 글자 검색·복사 가능 | 원청이 "독립된 HTML 파일"만 요구할 때 |
| └ 저장 단위: 교안 1개 = 파일 1개 | 교안 전체를 HTML 하나로 | 차시별 납품 |
| └ 저장 단위: 페이지마다 파일 | `교안_01.html`, `교안_02.html` … 을 ZIP 하나로 | 페이지 단위로 LMS에 올릴 때 |

모든 결과물은 설치 앱 없이 브라우저에서 바로 열리며, 인터넷 연결 없이도 동작합니다.

## 결과물 전달 방식 (변환 후 선택)

| 방식 | 방법 | 받는 사람 |
|---|---|---|
| **HTML 파일** | `HTML 저장` → 파일을 카톡·메일·LMS로 전달 | 파일을 더블클릭해서 열기 |
| **웹 링크** | `웹 링크` 선택 → `링크 만들기` → `https://도메인/b/xxxx` 복사해서 전달 | 링크만 누르면 바로 책 넘겨보기 (설치·다운로드 없음) |

> 웹 링크는 **Vercel 배포판에서만** 동작합니다 (아래 ‘웹 링크 켜기’ 설정 필요). 파일로 직접 열거나 일반 웹호스팅에 올리면 HTML 파일 방식만 사용할 수 있습니다.

## 웹 링크 켜기 (Vercel, 최초 1회)
1. 이 폴더를 GitHub에 올리고 Vercel에서 **Import** (Framework Preset: **Other**, Build Command 비움)
2. Vercel 프로젝트 → **Storage** → **Create Database** → **Blob** 선택 → 접근 방식 **Public** → 이 프로젝트에 **Connect**
   (환경변수 `BLOB_READ_WRITE_TOKEN`이 자동으로 들어갑니다)
3. **Redeploy** 후 변환기에서 `웹 링크` → `링크 만들기`로 확인
4. 만든 링크의 파일은 Vercel 프로젝트 → Storage → Blob의 `books/` 폴더에서 확인·삭제할 수 있습니다

### 점검 주소
`https://도메인/api/health` 를 열면 `{"ok":true,"blob":true}` 가 나와야 정상입니다.
`blob:false` 면 2번(Blob 저장소 연결)이 안 된 상태입니다.

### 변환기 화면 접근 제한(선택)
변환기 주소를 아는 사람은 누구나 링크를 만들 수 있습니다. 사내 전용으로 막으려면
Vercel 프로젝트 → **Settings → Deployment Protection → Password Protection**(Pro 요금제) 또는
**Vercel Authentication**을 켜세요. 만들어진 교안 링크(`/b/...`)는 그대로 외부에 공유됩니다.

## 사용 흐름
1. PowerPoint에서 교안 작성 → **파일 › 내보내기 › PDF**
2. 변환기에 PDF(또는 PPTX)를 끌어다 놓기
3. 결과물 형태 선택 → 전달 방식 선택 → **HTML 저장**(파일) 또는 **링크 만들기**(웹 주소)

## 운영 팁
- 결과 HTML은 인터넷 없이 단독 실행됩니다. 납품 전 오프라인 PC에서 한 번 열어보세요.
- 10MB 이하면 대부분 LMS에서 문제없습니다. 크면 화질을 "가볍게"로 낮추세요.
- 학생 배포용이면 "발표자 노트 포함"을 끄세요. 끄면 노트가 파일에서 완전히 빠집니다.

## 라이선스
- pdf.js — Apache License 2.0 (`vendor/pdfjs/LICENSE.txt`)
- JSZip — MIT / GPLv3 이중 라이선스 (`vendor/jszip/LICENSE.md`)
- Vercel Blob SDK 2.8.0 — Apache License 2.0 (`vendor/blob/LICENSE.md`)
- StPageFlip 2.0.7 — MIT License (c) 2020 Nodlik — 플립북 결과물 안에 내장됨
