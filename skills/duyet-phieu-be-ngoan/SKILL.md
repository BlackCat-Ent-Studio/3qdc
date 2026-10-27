---
name: duyet-phieu-be-ngoan
description: Gắn và dùng máy chủ MCP "Phiếu Bé Ngoan" của 3Q Đại Chiến để xem phiếu xin quà, đánh dấu Đã trả hoặc Từ chối. Dùng khi người dùng đưa mã bắt đầu bằng 3qp_, nhờ "gắn mã Phiếu Bé Ngoan", "duyệt phiếu", "xem phiếu hôm nay", "trả quà phiếu", "từ chối phiếu".
---

# Duyệt Phiếu Bé Ngoan (3Q Đại Chiến)

Người chơi gửi **phiếu xin quà** ở phieubengoan.3qdc.wanmeivn.com (mỗi Gmail một phiếu một ngày). Người dùng của bạn là
**người Duyệt phiếu**: họ trả quà **trong game bằng tay**, rồi nhờ bạn đánh dấu phiếu trên hệ thống. Bạn làm việc đó qua
máy chủ MCP `https://3qdc.wanmeivn.com/mcp`, kết nối thẳng qua HTTPS bằng mã riêng — không cần SSH hay VPS.

## Công cụ

| Công cụ | Làm gì |
|---|---|
| `xem_phieu` | Liệt kê phiếu. `ngay`: `hom-nay` (mặc định) · `hom-qua` · `tat-ca`. `trang_thai`: `cho` (mặc định) · `tra` · `tu` · `tat-ca`. Mỗi phiếu có **mã (id)**, nhân vật, server, quà muốn nhận, ghi chú. |
| `tra_qua` | Đánh dấu **Đã trả** một phiếu đang chờ. `id` bắt buộc, `phan_hoi` không bắt buộc (≤160 ký tự, người chơi đọc được). |
| `tu_choi` | Đánh dấu **Từ chối** một phiếu đang chờ. `id` và `phan_hoi` (lý do) **bắt buộc**. |

Phiếu đã xử lý rồi thì không đổi được qua công cụ (báo người dùng; muốn sửa thì nhờ Quản lý trên trang /quan-tri).
Hệ thống ghi người xử lý là `<tên đăng nhập> (Claude)`. Bạn không bao giờ thấy email người chơi — đừng tìm cách lấy.

## Bước 1 — Gắn mã (làm một lần)

Mã do Quản lý cấp, dạng `3qp_` + 43 ký tự. Người dùng dán mã cho bạn. Quy tắc với mã:
- Không nhắc lại đủ mã trong câu trả lời, không ghi vào file dự án, git, ghi chú hay tin nhắn. Khi cần nhắc thì chỉ ghi 4 ký tự cuối.
- Mã chỉ nằm trong cấu hình MCP của máy người dùng.

Hỏi người dùng đang dùng loại Claude nào (có thể nhiều loại), rồi gắn cho từng loại.

### A. Claude Code (terminal)

Mỗi tài khoản Claude Code có thư mục cấu hình riêng, nên **mỗi tài khoản phải gắn một lần**:
- Mặc định: `~/.claude` (Windows: `C:\Users\<tên>\.claude`).
- Tài khoản phụ (ví dụ lệnh `claude-canhan1`, `claude-canhan2`) thường dùng biến `CLAUDE_CONFIG_DIR` trỏ tới thư mục khác,
  ví dụ `~/.claude-canhan1`. Tìm các thư mục `~/.claude*` hoặc đọc script khởi động của lệnh đó để biết đúng thư mục;
  không chắc thì hỏi người dùng.

Với từng thư mục cấu hình, đặt `CLAUDE_CONFIG_DIR` rồi chạy (thay `<MÃ>`):

```powershell
# PowerShell (Windows) — bỏ dòng $env nếu là tài khoản mặc định
$env:CLAUDE_CONFIG_DIR = "$HOME\.claude-canhan1"
claude mcp remove 3qdc-phieu --scope user 2>$null
claude mcp add --transport http --scope user 3qdc-phieu https://3qdc.wanmeivn.com/mcp --header "Authorization: Bearer <MÃ>"
claude mcp list
```

```bash
# bash / zsh
CLAUDE_CONFIG_DIR=~/.claude-canhan1 claude mcp remove 3qdc-phieu --scope user 2>/dev/null
CLAUDE_CONFIG_DIR=~/.claude-canhan1 claude mcp add --transport http --scope user 3qdc-phieu https://3qdc.wanmeivn.com/mcp --header "Authorization: Bearer <MÃ>"
CLAUDE_CONFIG_DIR=~/.claude-canhan1 claude mcp list
```

`claude mcp list` phải hiện `3qdc-phieu: … ✔ Connected`. Sau khi gắn, người dùng mở **phiên Claude Code mới** của tài khoản đó
(phiên đang chạy không tự nạp máy chủ mới).

### B. App Claude trên máy tính (Claude Desktop)

App này không dán mã thẳng vào mục Connectors được; dùng cầu nối `mcp-remote` trong file cấu hình:

1. Kiểm tra có Node.js 18+ (`node -v`). Chưa có thì nhờ người dùng cài từ nodejs.org rồi làm tiếp.
2. Mở file cấu hình (tạo mới nếu chưa có):
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
3. **Sao lưu file cũ trước** (ví dụ `claude_desktop_config.json.bak`), giữ nguyên các máy chủ đang có, chỉ thêm khối
   `3qdc-phieu` vào `mcpServers`:

```json
{
  "mcpServers": {
    "3qdc-phieu": {
      "command": "npx",
      "args": ["-y", "mcp-remote@latest", "https://3qdc.wanmeivn.com/mcp", "--header", "Authorization:${AUTH_HEADER}"],
      "env": { "AUTH_HEADER": "Bearer <MÃ>" }
    }
  }
}
```

   Mã để trong `env` (không để trong `args`) vì trên Windows dấu cách trong `args` bị cắt sai.
4. Kiểm tra file vẫn là JSON hợp lệ (đọc lại bằng một trình đọc JSON).
5. Nhờ người dùng **thoát hẳn** app Claude (cả biểu tượng ở khay hệ thống) rồi mở lại. Máy chủ `3qdc-phieu` sẽ hiện trong
   danh sách công cụ của app.

### Thử kết nối

Gọi `xem_phieu` (không tham số). Thấy dòng "Ngày: hôm nay · lọc: Đang chờ…" là xong.

## Bước 2 — Duyệt phiếu hằng ngày

1. **Xem**: gọi `xem_phieu`. Trình bày gọn cho người dùng: mã phiếu, nhân vật, server, quà, ghi chú. Nhiều phiếu thì nhóm
   theo server.
2. **Người dùng trả quà trong game.** Bạn không trả quà được — chỉ đánh dấu.
3. **Đánh dấu Đã trả**: chỉ gọi `tra_qua` cho phiếu mà người dùng **đã xác nhận rõ** là trả xong (theo mã hoặc tên nhân
   vật). Không tự đánh dấu hàng loạt khi chưa được xác nhận từng phiếu hoặc được bảo rõ "đánh dấu hết các phiếu này".
   Phản hồi mặc định nếu người dùng không dặn: "Quà đã được gửi vào game, chúc chúa công chơi vui!"
4. **Từ chối**: gọi `tu_choi` với lý do ngắn, lịch sự, nói người chơi cần làm gì (ví dụ: "Tên nhân vật không tìm thấy
   trên server S1, chúa công kiểm tra lại và gửi phiếu mới nhé."). Hỏi người dùng lý do nếu chưa rõ.
5. Xong thì báo lại: bao nhiêu phiếu đã trả, đã từ chối, còn chờ.

Phản hồi gửi tới người chơi: tiếng Việt, lịch sự, xưng "chúa công", tối đa 160 ký tự, không hứa điều người dùng chưa nói.

## Khi có lỗi

| Gặp | Nghĩa là | Làm gì |
|---|---|---|
| 401 / "mã không còn hiệu lực" | Mã bị thu hồi, hoặc tài khoản bị khoá / đổi vai trò | Báo người dùng xin Quản lý mã mới, rồi gắn lại (Bước 1, có `remove` trước) |
| 429 | Gọi quá nhiều trong một phút / sai mã nhiều lần | Chờ 1 phút (sai mã: 15 phút) rồi thử lại |
| "đã được xử lý trước đó" | Người khác đã đánh dấu phiếu | Báo người dùng, không thử lại |
| `claude mcp list` không Connected | Sai mã, sai URL, hoặc không có mạng | Kiểm tra lại mã (4 ký tự cuối), URL `https://3qdc.wanmeivn.com/mcp` |

## Đổi hoặc gỡ mã

- Claude Code: `claude mcp remove 3qdc-phieu --scope user` (đúng `CLAUDE_CONFIG_DIR`), rồi `add` lại với mã mới.
- Claude Desktop: sửa giá trị `AUTH_HEADER` (hoặc xoá khối `3qdc-phieu`), lưu, thoát hẳn và mở lại app.
