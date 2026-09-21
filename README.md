# 서도화 랜딩 페이지

GitHub Pages에 그대로 올릴 수 있는 개인 소개 페이지입니다. 빌드나 패키지 설치가 필요하지 않습니다.

## 프로젝트 소개 수정

`data/projects.json`을 편집하세요. 저장한 뒤 GitHub에 업로드하면 배포 시 반영됩니다.

| 항목 | 내용 |
| --- | --- |
| `title` | 프로젝트 이름 |
| `category` | 프로젝트 분류 |
| `description` | 짧은 소개 |
| `url` | 프로젝트 사이트 주소 |
| `posts` | 회고·관련 글 링크 목록. 없으면 `[]` 유지 |

### 회고 링크 추가

원하는 프로젝트의 `"posts": []`를 다음과 같이 바꾸세요. 아래 주소와 제목은 실제 작성한 글로 교체합니다.

```json
"posts": [
  {
    "title": "프로젝트를 마치며",
    "url": "https://example.com/my-retrospective",
    "date": "2026-09-15"
  }
]
```

- 글은 블로그·Notion 등 외부 서비스에서 작성합니다. 이 사이트는 링크만 표시합니다.
- `date`는 선택 사항이며, 쓴다면 `YYYY-MM-DD` 형식입니다.
- 프로젝트와 글은 파일에 적힌 순서대로 나옵니다.
- 글이 없으면 기록 예정 안내를 보여줍니다.
- 링크는 `https://` 또는 `http://`로 시작하는 전체 주소를 사용하세요.
- JSON에는 주석을 넣을 수 없습니다. 마지막 항목 뒤에는 쉼표를 붙이지 마세요.

## 다른 내용 수정

- 자기소개·기술·학력: `index.html`
- 색상·폰트: `tokens.css`
- 배치·모바일 화면·애니메이션: `styles.css`

닉네임은 서도화로 표시하며 실명은 넣지 않았습니다. 폰트는 Google Fonts의 Gasoek One, jsDelivr의 Pretendard를 사용합니다. 폰트를 불러오지 못하면 대체 글꼴로 표시됩니다.

## GitHub Pages 업로드

계정의 첫 페이지로 사용하려면 `사용자명.github.io` 저장소의 최상위에 아래 파일과 폴더를 올리세요.

```text
index.html
styles.css
tokens.css
app.js
favicon.svg
.nojekyll
data/
  projects.json
```

저장소의 **Settings → Pages → Deploy from a branch**에서 업로드한 브랜치와 **/(root)**를 선택하고 저장합니다. 이미 Pages가 설정된 저장소라면 기존 설정을 유지하세요. 다른 프로젝트 저장소의 하위 경로에서도 상대경로로 동작하도록 구성되어 있습니다.

`AGENTS.md`, `sources/`, `.hallmark/`는 웹사이트 배포에 필요하지 않습니다. 업로드용 ZIP에는 이 파일들을 포함하지 않았습니다.

## 로컬 미리보기

이 폴더에서 다음 명령을 실행한 뒤 `http://localhost:4173`을 여세요.

```sh
python3 -m http.server 4173
```

`index.html`을 더블클릭해 `file://`로 열면 브라우저 제한으로 JSON을 읽지 못할 수 있습니다. 로컬 서버나 GitHub Pages에서 확인하세요.

## 디자인 및 소개 참고

- 디자인 지침: [Nutlope / Hallmark](https://github.com/Nutlope/hallmark)
- 프로젝트 설명: [Call of the King](https://kookmin-sw.github.io/2026-capstone-11/), [Underground Catalog](https://ugcatalog.pages.dev), [스플래툰 3 무기 데이터베이스](https://amenorica.github.io/splatoon3-weapon-browser/)
- 프로젝트의 개인별 담당 역할은 기재하지 않았습니다.

## 확인 상태

HTML의 내부 연결, 필수 파일, 프로젝트 JSON, JavaScript 문법과 로컬 HTTP 응답을 검사했습니다. 반응형 레이아웃과 동작 줄이기 설정을 구현했으나, 브라우저 보안 정책 확인 오류로 실제 화면 및 클릭 동작 검증은 수행하지 못했습니다. GitHub 배포는 아직 하지 않았습니다.
