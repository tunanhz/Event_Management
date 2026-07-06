# Hướng dẫn: Tool Review Code PR trước khi merge vào `develop`

Tool này tự động **kiểm tra chất lượng** và **AI review** mọi Pull Request nhắm vào nhánh `develop`, giúp PM duyệt code của thành viên trước khi merge.

## Tool gồm những gì

| Thành phần | File | Vai trò | Chặn merge? |
|-----------|------|---------|:---:|
| CI quality gate | `.github/workflows/pr-checks.yml` | Lint · Typecheck · Build (BE+FE) · Secret scan | ✅ Có |
| AI review | `.github/workflows/claude-code-review.yml` | Claude đọc diff → comment tiếng Việt | ❌ Tham khảo |
| PR template | `.github/pull_request_template.md` | Checklist cho người tạo PR | — |
| CODEOWNERS | `.github/CODEOWNERS` | Tự request PM review mọi PR | — |

## Luồng hoạt động

```
Thành viên push branch → mở Pull Request vào develop
        │
        ├─► PR Checks (bắt buộc pass):
        │     • Backend : lint + tsc --noEmit + build
        │     • Frontend: lint + tsc --noEmit + next build
        │     • Security: gitleaks (chặn nếu lộ secret) + npm audit (cảnh báo)
        │
        ├─► Claude AI Review: comment nhận xét bug/bảo mật/chất lượng
        │
        └─► CODEOWNERS tự request PM duyệt

  Chỉ khi: CI xanh  +  PM approve  →  nút Merge mới bật.
```

---

## ⚙️ Cài đặt 1 lần (PM làm trên GitHub)

### Bước 1 — Thêm secret `ANTHROPIC_API_KEY` (cho AI review)

AI review cần API key của Anthropic. Lấy key tại <https://console.anthropic.com> → API Keys.

Thêm vào repo (2 cách):

- **Web:** repo → *Settings* → *Secrets and variables* → *Actions* → *New repository secret*
  - Name: `ANTHROPIC_API_KEY` · Secret: `sk-ant-...`
- **CLI:**
  ```bash
  gh secret set ANTHROPIC_API_KEY --repo tunanhz/Event_Management
  # dán key khi được hỏi
  ```

> Chưa thêm key thì job "Claude AI Code Review" sẽ đỏ nhưng **không chặn merge** (nó chỉ là tham khảo). Các CI check khác vẫn chạy bình thường.

### Bước 2 — Bật Branch Protection cho `develop`

Đây là phần "chặn cứng". Có thể bật bằng lệnh (xem `plan.md`) hoặc thủ công:

repo → *Settings* → *Branches* → *Add branch ruleset* (hoặc *Add rule*) cho `develop`:

- ☑ **Require a pull request before merging** → Require approvals: **1**
- ☑ **Require review from Code Owners**
- ☑ **Require status checks to pass before merging** → chọn:
  - `Backend (lint · typecheck · build)`
  - `Frontend (lint · typecheck · build)`
  - `Security scan (secrets · deps)`
- ☑ **Require branches to be up to date before merging**
- ☑ **Do not allow bypassing the above settings** (áp cả cho admin nếu muốn nghiêm)

> Lưu ý: tên status check chỉ hiện trong danh sách sau khi workflow đã chạy **ít nhất 1 lần** (mở 1 PR thử).

---

## 👤 Cách dùng hằng ngày

### Thành viên
1. Tạo branch từ `develop`: `git checkout -b EM-xx-mo-ta`
2. Code → commit → push branch.
3. Mở PR vào `develop`, điền theo template.
4. Chờ CI xanh + sửa theo comment của Claude/PM → xin merge.

### PM
1. Vào tab *Pull requests* → mở PR.
2. Đọc:
   - **Checks**: xanh = đạt cổng chất lượng; đỏ = mở log xem lỗi.
   - **Comment của Claude**: tóm tắt bug/bảo mật/chất lượng.
3. Review thêm nếu cần → **Approve** hoặc **Request changes**.
4. CI xanh + đã approve → bấm **Merge**.

---

## 🔧 Tinh chỉnh

- **Đổi người review:** sửa `@tunanhz` trong `.github/CODEOWNERS`.
- **Thêm/bớt check:** sửa `.github/workflows/pr-checks.yml`.
- **Đổi cách AI review:** sửa `prompt` trong `.github/workflows/claude-code-review.yml`.
- **Nợ lint hiện có:** một số rule đang để `warn` để không chặn code cũ
  (`backend/eslint.config.mjs`, `frontend/eslint.config.mjs`). Dọn dần rồi nâng lại `error`:
  - backend: `no-useless-catch`, `@typescript-eslint/no-explicit-any` (nhiều `any`)
  - frontend: `no-explicit-any`, `no-empty-object-type`, `react-hooks/set-state-in-effect`,
    `react-hooks/immutability` (login page dùng biến trước khi khai báo)

## ❓ Xử lý sự cố

| Hiện tượng | Nguyên nhân | Cách xử lý |
|-----------|-------------|-----------|
| Job Claude đỏ "missing api key" | Chưa thêm secret | Làm Bước 1 |
| Status check không hiện trong Branch Protection | Workflow chưa chạy lần nào | Mở 1 PR thử rồi quay lại chọn |
| gitleaks đỏ | PR có chuỗi giống secret | Xóa secret khỏi code, dùng biến môi trường; nếu false-positive thêm `.gitleaksignore` |
| Build FE đỏ do gọi API lúc build | Page fetch bị cache (prerender) | Để page ở chế độ dynamic (fetch mặc định uncached) |
