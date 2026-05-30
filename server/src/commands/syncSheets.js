import { google } from "googleapis";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPREADSHEET_ID = "1OxcCPuC0RINeeG54JdVjGhxe_ZJvGjf8VmODugiSzUw";

async function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, "../../serviceAccount.json"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return auth.getClient();
}

// ── Helper: tạo block cho 1 endpoint ──

function endpoint(
  method,
  path,
  desc,
  status,
  header,
  params,
  bodyFields,
  responseFields,
  notes,
) {
  return [
    method,
    path,
    desc,
    status,
    header,
    params || "",
    bodyFields || "",
    responseFields || "",
    notes || "",
  ];
}

function section(title) {
  return [title, "", "", "", "", "", "", "", ""];
}

function blank() {
  return [];
}

// ── Format field lists ──
// Mỗi field 1 dòng: "field: type (required)" hoặc "field: type"

const HEADERS = [
  "Method",
  "Endpoint",
  "Mô tả",
  "Status",
  "Header",
  "Params / Query",
  "Body",
  "Response",
  "Ghi chú",
];

// ── AUTH TAB ──

const AUTH_DATA = [
  HEADERS,
  blank(),
  section("AUTHENTICATION"),
  endpoint(
    "POST",
    "/api/auth/signup",
    "Đăng ký tài khoản mới",
    "201",
    "",
    "",
    `{
  "email": "string",       // required
  "password": "string",    // required
  "fullName": "string"     // required
}`,
    `{
  "success": true,
  "data": {
    "id": "string",
    "email": "string",
    "fullName": "string",
    "role": "user",
    "isEmailVerified": false,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}`,
    "Password được hash bcrypt (10 rounds)",
  ),
  endpoint(
    "POST",
    "/api/auth/signin",
    "Đăng nhập",
    "200",
    "",
    "",
    `{
  "email": "string",       // required
  "password": "string"     // required
}`,
    `{
  "success": true,
  "accessToken": "eyJhbG..."
}

+ Set-Cookie: refreshToken
  (httpOnly, secure, sameSite: strict, 14 ngày)`,
    "FE lưu accessToken vào localStorage\nCookie refreshToken tự động set",
  ),
  endpoint(
    "POST",
    "/api/auth/signout",
    "Đăng xuất",
    "204",
    "",
    "",
    "",
    "No Content",
    "Xóa cookie refreshToken",
  ),
  endpoint(
    "POST",
    "/api/auth/refresh",
    "Làm mới accessToken",
    "200",
    "",
    "",
    "",
    `{
  "success": true,
  "accessToken": "eyJhbG..."  // JWT mới, 7 ngày
}`,
    "Gửi kèm cookie refreshToken\nNếu fail → clear cookie → redirect login",
  ),
  blank(),
  section("USER INFO"),
  endpoint(
    "GET",
    "/api/me",
    "Lấy thông tin user đang đăng nhập",
    "200",
    "Authorization: Bearer <accessToken>",
    "",
    "",
    `{
  "success": true,
  "data": {
    "id": "string",
    "email": "string",
    "fullName": "string",
    "role": "user | admin",
    "avatarUrl": "string | null",
    "isEmailVerified": false
  }
}`,
    "Gọi khi load app để check auth state",
  ),
];

// ── ADMIN TAB ──

const ADMIN_DATA = [
  HEADERS,
  blank(),
  section("ADMIN: TẠO BÀI HỌC (4 BƯỚC)"),
  endpoint(
    "POST",
    "/api/admin/writings/preview",
    "Bước 1: AI phân tích đoạn văn\n→ tách câu + dịch + trích từ vựng\n(CHƯA lưu DB)",
    "200",
    "Authorization: Bearer <token>\n(role: admin)",
    "",
    `{
  "paragraph": "string",      // required - đoạn văn EN
  "type": "reverse_translation",
  "level": "beginner",         // required
  "contentType": "general",    // email|diary|essay|article|story|report|general
  "topic": "everyday_life",
  "title": "string",
  "description": "string"
}`,
    `{
  "success": true,
  "data": {
    "vietnameseParagraph": "Bản dịch toàn bộ...",
    "sentences": [
      {
        "order": 1,
        "referenceAnswer": "Câu EN gốc",
        "vietnameseText": "Bản dịch VN",
        "explanation": "Ghi chú ngữ pháp"
      }
    ],
    "vocabulary": [
      {
        "sentenceIndex": 1,
        "word": "string",
        "partOfSpeech": "verb_phrase",
        "meaning": "nghĩa tiếng Việt",
        "example": "câu ví dụ EN"
      }
    ],
    "provider": "claude | gemini"
  }
}`,
    "Chưa lưu DB\nFE hiển thị preview cho admin review/chỉnh sửa\nSau đó sang bước 2",
  ),
  endpoint(
    "POST",
    "/api/admin/writings",
    "Bước 2: Tạo bài học draft\n(isPublished = false)",
    "201",
    "Authorization: Bearer <token>\n(role: admin)",
    "",
    `{
  "title": "string",          // required
  "type": "reverse_translation", // required
  "level": "beginner",        // required
  "contentType": "general",
  "topic": "everyday_life",
  "description": "string",
  "isPremium": false,
  "sortOrder": 1,
  "vietnameseParagraph": "string",
  "sentences": [              // required
    {
      "vietnameseText": "string",    // required
      "referenceAnswer": "string",   // required
      "explanation": "string"
    }
  ]
}`,
    `{
  "success": true,
  "data": {
    "id": "ObjectId",          // ← dùng cho bước 3, 4
    "type": "reverse_translation",
    "title": "...",
    "level": "beginner",
    "isPublished": false,
    "totalSentences": 5
  }
}`,
    "Lưu lại data.id để gọi bước 3, 4\n\ntype values:\nreverse_translation\nsee_and_write\nparaphrasing\nexam_simulation",
  ),
  endpoint(
    "POST",
    "/api/admin/writings/:id/dictionary",
    "Bước 3: Lưu từ vựng cho bài học",
    "201",
    "Authorization: Bearer <token>\n(role: admin)",
    ":id — ObjectId từ bước 2",
    `{
  "entries": [                 // required, không rỗng
    {
      "word": "string",        // required
      "meaning": "tiếng Việt", // required
      "partOfSpeech": "verb",
      "example": "câu ví dụ EN",
      "sentenceIndex": 1       // null = áp dụng cả bài
    }
  ]
}`,
    `{
  "success": true,
  "data": {
    "saved": 5                 // số entries đã lưu
  }
}`,
    "Upsert: tạo mới hoặc cập nhật\nCó thể gọi lại nhiều lần",
  ),
  endpoint(
    "PATCH",
    "/api/admin/writings/:id/publish",
    "Bước 4: Publish bài học\n→ hiển thị cho học viên",
    "200",
    "Authorization: Bearer <token>\n(role: admin)",
    ":id — ObjectId từ bước 2",
    "",
    `{
  "success": true,
  "data": {
    "id": "ObjectId",
    "title": "...",
    "isPublished": true,
    "totalSentences": 5
  }
}`,
    "Sau publish → hiển thị ở GET /api/writings",
  ),
  blank(),
  section("ERROR RESPONSES"),
  endpoint(
    "",
    "",
    "Validation error",
    "400",
    "",
    "",
    "",
    `{ "success": false, "error": "Missing required field: xxx" }`,
    "",
  ),
  endpoint(
    "",
    "",
    "Chưa đăng nhập",
    "401",
    "",
    "",
    "",
    `{ "success": false, "error": "Not authorized" }`,
    "",
  ),
  endpoint(
    "",
    "",
    "Không đủ quyền",
    "403",
    "",
    "",
    "",
    `{ "success": false, "error": "Access denied" }`,
    "",
  ),
  endpoint(
    "",
    "",
    "Không tìm thấy",
    "404",
    "",
    "",
    "",
    `{ "success": false, "error": "Not found" }`,
    "",
  ),
  endpoint(
    "",
    "",
    "Trùng dữ liệu",
    "409",
    "",
    "",
    "",
    `{ "success": false, "error": "Email already exists" }`,
    "",
  ),
  endpoint(
    "",
    "",
    "Lỗi server",
    "500",
    "",
    "",
    "",
    `{ "success": false, "error": "Internal server error" }`,
    "",
  ),
];

// ── Main ──

async function syncSheets() {
  const authClient = await getAuthClient();
  const sheets = google.sheets({ version: "v4", auth: authClient });

  const sheetMap = {
    Auth: AUTH_DATA,
    Admin: ADMIN_DATA,
  };

  for (const [sheetName, data] of Object.entries(sheetMap)) {
    // Clear existing data (9 columns now)
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:I`,
    });

    // Write new data
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: data },
    });

    console.log(`✓ ${sheetName} — ${data.length} rows`);
  }

  // Auto-resize columns + wrap text for all sheets
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });

  const requests = [];
  for (const sheet of spreadsheet.data.sheets) {
    const sheetId = sheet.properties.sheetId;
    const sheetTitle = sheet.properties.title;

    if (!sheetMap[sheetTitle]) continue;

    // Set wrap text for all cells
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          startColumnIndex: 0,
          endColumnIndex: 9,
        },
        cell: {
          userEnteredFormat: { wrapStrategy: "WRAP", verticalAlignment: "TOP" },
        },
        fields:
          "userEnteredFormat.wrapStrategy,userEnteredFormat.verticalAlignment",
      },
    });

    // Set column widths
    const colWidths = [70, 230, 200, 50, 160, 180, 350, 280, 250];
    colWidths.forEach((width, i) => {
      requests.push({
        updateDimensionProperties: {
          range: {
            sheetId,
            dimension: "COLUMNS",
            startIndex: i,
            endIndex: i + 1,
          },
          properties: { pixelSize: width },
          fields: "pixelSize",
        },
      });
    });

    // Bold + freeze header row
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: 9,
        },
        cell: {
          userEnteredFormat: {
            textFormat: { bold: true },
            backgroundColor: { red: 0.85, green: 0.92, blue: 0.83 },
            horizontalAlignment: "CENTER",
            wrapStrategy: "WRAP",
            verticalAlignment: "MIDDLE",
          },
        },
        fields:
          "userEnteredFormat(textFormat,backgroundColor,horizontalAlignment,wrapStrategy,verticalAlignment)",
      },
    });

    requests.push({
      updateSheetProperties: {
        properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
        fields: "gridProperties.frozenRowCount",
      },
    });

    // Style section headers (green background)
    const data = sheetMap[sheetTitle];
    data.forEach((row, i) => {
      if (
        row.length > 0 &&
        row[0] &&
        !["Method", "POST", "GET", "PATCH", "DELETE", "PUT", ""].includes(
          row[0],
        )
      ) {
        requests.push({
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: i,
              endRowIndex: i + 1,
              startColumnIndex: 0,
              endColumnIndex: 9,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.42, green: 0.56, blue: 0.35 },
                textFormat: {
                  bold: true,
                  foregroundColor: { red: 1, green: 1, blue: 1 },
                },
                horizontalAlignment: "CENTER",
              },
            },
            fields:
              "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
          },
        });
      }
    });
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests },
    });
    console.log("✓ Formatting applied");
  }

  console.log("\nSync complete!");
}

syncSheets().catch((err) => {
  console.error("Sync failed:", err.message);
  process.exit(1);
});
