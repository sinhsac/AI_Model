# AI Model - Linh Trang Character Profile Manager

## 📋 Tổng Quan Dự Án

Đây là hệ thống quản lý hồ sơ nhân vật AI và tạo prompt cho việc sinh ảnh bằng AI. Dự án được thiết kế để quản lý nhân vật "Linh Trang" - một người phụ nữ Việt Nam 23 tuổi với các đặc điểm ngoại hình được định nghĩa chi tiết, tối ưu hóa cho việc tạo ảnh AI chân thực và đời thường.

### 🎯 Mục Đích

- **Quản lý hồ sơ nhân vật**: Lưu trữ và chỉnh sửa thông tin chi tiết về nhân vật (ngoại hình, tính cách, background)
- **Quản lý scenes**: Tạo và quản lý các tình huống/cảnh khác nhau cho nhân vật
- **Tạo prompt tự động**: Sinh prompt chi tiết để sử dụng với các công cụ AI tạo ảnh (như Gemini, Stable Diffusion, Midjourney)
- **Quản lý ảnh**: Upload và lưu trữ các ảnh đã tạo theo từng scene

## 🏗️ Kiến Trúc Dự Án

```
AI_model/
├── character_profile.json          # File JSON chứa toàn bộ thông tin nhân vật và scenes
├── server.py                       # Python backend server (HTTP)
└── public/                         # Frontend files
    ├── index.html                  # Giao diện chính
    ├── app.js                      # Logic frontend
    ├── style.css                   # Styling (dark theme, glassmorphism)
    └── uploads/                    # Thư mục lưu ảnh đã upload
        └── [scene_id]/             # Ảnh được tổ chức theo scene
```

## ✨ Tính Năng Chính

### 1. **Quản Lý Hồ Sơ Nhân Vật**
- ✅ Chỉnh sửa thông tin cơ bản (tên, tuổi, dân tộc)
- ✅ Quản lý đặc điểm ngoại hình chi tiết:
  - Khuôn mặt (hình dạng, mắt, mũi, môi, da, má)
  - Cơ thể (chiều cao, vóc dáng, tư thế)
  - Tóc
- ✅ Quản lý tính cách (traits, MBTI, tone)
- ✅ Quản lý background (quê quán, nghề nghiệp, học vấn, gia đình)
- ✅ Cài đặt trang phục mặc định
- ✅ Cài đặt photography mặc định (quality, lighting, composition)

### 2. **Quản Lý Scenes**
- ✅ Tạo scene mới với các thông tin:
  - Tên scene
  - Action (hành động)
  - Setting (bối cảnh)
  - Outfit changes (thay đổi trang phục - optional)
  - Lighting (ánh sáng - optional)
  - View (góc nhìn - optional)
  - Props (đạo cụ - optional)
- ✅ Chỉnh sửa scene qua form UI
- ✅ Chỉnh sửa scene qua JSON editor (advanced mode)
- ✅ Clone scene để tạo biến thể
- ✅ Xóa scene với confirmation dialog
- ✅ Phân trang (6 scenes/trang)
- ✅ Sắp xếp theo thời gian cập nhật (mới nhất trước)

### 3. **Tạo Prompt Tự Động**
- ✅ Sinh prompt dựa trên:
  - Thông tin nhân vật từ `core_identity_prompt`
  - Thông tin scene cụ thể
  - Kết hợp outfit, lighting, view, props
- ✅ Copy prompt ra clipboard
- ✅ Hiển thị prompt trong modal với formatting

### 4. **Quản Lý Ảnh**
- ✅ Upload ảnh cho từng scene
- ✅ Lưu trữ ảnh theo cấu trúc `/uploads/[scene_id]/[timestamp].jpg`
- ✅ Gallery view cho mỗi scene
- ✅ Hiển thị thumbnail trên scene card
- ✅ Click để xem ảnh full size trong tab mới
- ✅ Đếm số lượng ảnh đã upload

### 5. **UI/UX Hiện Đại**
- ✅ Dark theme với glassmorphism effect
- ✅ Responsive grid layout
- ✅ Toast notifications (thay thế alert)
- ✅ Modal dialogs với animation
- ✅ Icon-based actions (Font Awesome)
- ✅ Hover effects và transitions mượt mà

## 🚀 Cài Đặt và Chạy

### Yêu Cầu Hệ Thống
- Python 3.7+
- Trình duyệt web hiện đại (Chrome, Firefox, Edge)

### Bước 1: Clone hoặc tải dự án
```bash
cd d:\001.Sac\projects\gravity\AI_model
```

### Bước 2: Chạy server
```bash
python server.py
```

Server sẽ chạy tại: `http://localhost:3000`

### Bước 3: Mở trình duyệt
Truy cập: `http://localhost:3000`

## 📖 Hướng Dẫn Sử Dụng

### 1. Chỉnh Sửa Hồ Sơ Nhân Vật
1. Click nút **Edit** (icon bút) ở phần "Character Profile"
2. Điền/sửa thông tin trong form
3. Click **Save Full Profile**

### 2. Tạo Scene Mới
1. Click nút **+ New Scene** ở header
2. Điền thông tin scene:
   - **Scene Name**: Tên mô tả (VD: "Cafe Reading")
   - **Action**: Hành động (VD: "sitting and reading a book")
   - **Setting**: Bối cảnh (VD: "cozy cafe with warm lighting")
   - **Outfit** (optional): Thay đổi trang phục
   - **Lighting** (optional): Ánh sáng đặc biệt
   - **View** (optional): Góc nhìn
   - **Props** (optional): Đạo cụ
3. Click **Save Scene**

### 3. Chỉnh Sửa Scene
- **Cách 1 - Form UI**: Click icon **Edit** (bút) trên scene card
- **Cách 2 - JSON**: Click icon **Code** (`</>`) để chỉnh sửa JSON trực tiếp

### 4. Tạo Prompt
1. Click icon **Magic** (⚡) trên scene card
2. Prompt sẽ hiển thị trong modal
3. Click **Copy to Clipboard** để copy
4. Paste vào công cụ AI tạo ảnh (Gemini, Midjourney, etc.)

### 5. Upload Ảnh Đã Tạo
1. Click icon **Image** trên scene card để mở Gallery
2. Click **Upload Image**
3. Chọn file ảnh từ máy
4. Ảnh sẽ được lưu và hiển thị trong gallery

### 6. Clone Scene
1. Click icon **Copy** trên scene card
2. Scene mới sẽ được tạo với ID mới
3. Chỉnh sửa scene clone theo ý muốn

### 7. Xóa Scene
1. Click icon **Trash** (thùng rác) màu đỏ
2. Xác nhận trong dialog
3. Scene sẽ bị xóa vĩnh viễn

## 📊 Cấu Trúc Dữ Liệu

### Character Profile Structure
```json
{
  "character": {
    "name": "Linh Trang",
    "age": "23 years old",
    "ethnicity": "Vietnamese (MUST avoid Chinese, Korean, Japanese...)",
    "hair": "long, straight, jet black...",
    "body": {
      "type": "fit and toned...",
      "height": "165cm (average Vietnamese height)",
      "build": "slim waist, toned arms...",
      "posture": "confident and natural"
    },
    "face": {
      "shape": "soft oval...",
      "eyes": "almond-shaped, dark brown...",
      "eyebrows": "naturally arched...",
      "nose": "straight, slightly button",
      "lips": "natural, rose-pink",
      "skin": "light to medium tan...",
      "cheekbones": "high but soft",
      "features": "small mole near left eye"
    },
    "personality": {
      "traits": ["friendly", "energetic", "curious"...],
      "mbti": "ENFP",
      "tone": "warm, casual, occasionally playful"
    },
    "background": {
      "hometown": "Hanoi, Vietnam",
      "occupation": "Content Creator & Digital Marketing Specialist",
      "education": "University graduate - Communications & Media",
      "family": "middle-class family..."
    },
    "base_outfit": {
      "top": "fitted white short-sleeved t-shirt",
      "bottom": "high-waisted muted olive leggings",
      "accessories": ""
    },
    "photography": {
      "quality": "high-quality, realistic photo",
      "lighting": "natural daylight",
      "composition": "cinematic composition"
    },
    "core_identity_prompt": "A high-quality, realistic photo of Linh Trang..."
  },
  "scenes": [...]
}
```

### Scene Structure
```json
{
  "id": "scene_01",
  "name": "Electric Scooter - Roadside",
  "action": "standing on an electric scooter",
  "props": "modern, matte black and grey scooter",
  "setting": "roadside in Vietnam, paved sidewalk...",
  "view": "side view",
  "outfit_changes": "...",
  "lighting": "...",
  "createdAt": "2026-01-17T12:15:26.394918",
  "updatedAt": "2026-01-17T13:18:33.110403",
  "generated_images": [
    "/uploads/scene_01/1768627149.jpg",
    "/uploads/scene_01/1768630713.jpg"
  ]
}
```

## 🔧 API Endpoints

### GET `/api/profile`
Lấy toàn bộ dữ liệu profile (character + scenes)

### PUT `/api/profile`
Cập nhật thông tin character
```json
{
  "character": { ... }
}
```

### POST `/api/scenes`
Tạo scene mới
```json
{
  "newScene": { ... }
}
```

### PUT `/api/scenes`
Cập nhật scene
```json
{
  "scene": { ... }
}
```

### DELETE `/api/scenes/{scene_id}`
Xóa scene

### POST `/api/generate-prompt`
Tạo prompt cho scene
```json
{
  "scene": { ... }
}
```

### POST `/api/upload`
Upload ảnh cho scene
```json
{
  "sceneId": "scene_01",
  "image": "data:image/jpeg;base64,..."
}
```

## 🎨 Thiết Kế UI

### Color Scheme
- **Background**: `#0f1115` (dark)
- **Card Background**: `#161b22` (dark gray)
- **Primary**: `#58a6ff` (blue)
- **Text Main**: `#c9d1d9` (light gray)
- **Text Muted**: `#8b949e` (muted gray)
- **Border**: `#30363d` (subtle gray)

### Typography
- **Font Family**: Inter (Google Fonts)
- **Icons**: Font Awesome 6.0

### Effects
- Glassmorphism (backdrop-filter blur)
- Smooth transitions (0.2s - 0.3s)
- Hover effects trên cards và buttons
- Toast animations (slide in/fade out)

## 📝 Scenes Hiện Có

Dự án hiện có **24 scenes** được định nghĩa sẵn:

1. **Electric Scooter - Roadside** ✅ (8 ảnh)
2. **Front View Scooter** ✅ (2 ảnh)
3. **Cafe - No Mask** ✅ (1 ảnh)
4. **Street Walk - White Outfit** ✅ (1 ảnh)
5. **Golden Hour Portrait** ✅ (1 ảnh)
6. **Market Shopping** ✅ (1 ảnh)
7. **Gym Workout** ✅ (1 ảnh)
8. **Beach Sunset** ✅ (1 ảnh)
9. **Study/Work**
10. **Night Street Food**
11. **Bookstore Browse**
12. **Rain Day**
13. **Cafe Coc - Sidewalk**
14. **Park Morning Exercise**
15. **Hoan Kiem Lake**
16. **Flower Stall**
17. **Temple Visit**
18. **Motorbike Ready** ✅ (1 ảnh)
19. **Tra Da Sidewalk**
20. **Supermarket Grocery**
21. **Co-working Space**
22. **Home Cooking**
23. **Lantern Street**
24. **Bus Stop Waiting**

*(✅ = đã có ảnh upload)*

## 🔐 Đặc Điểm Kỹ Thuật

### Backend (Python)
- **Framework**: HTTP server built-in (http.server, socketserver)
- **Port**: 3000
- **CORS**: Enabled cho local development
- **File handling**: Base64 encoding cho upload ảnh
- **JSON storage**: File-based persistence

### Frontend (Vanilla JS)
- **No frameworks**: Pure HTML/CSS/JavaScript
- **ES6+**: Modern JavaScript features
- **Fetch API**: Async/await cho API calls
- **LocalStorage**: Không sử dụng (data từ server)
- **Responsive**: Grid layout tự động điều chỉnh

## 🐛 Troubleshooting

### Server không chạy được
```bash
# Kiểm tra Python version
python --version

# Kiểm tra port 3000 có bị chiếm không
netstat -ano | findstr :3000

# Thử port khác (sửa trong server.py)
PORT = 3001
```

### Không upload được ảnh
- Kiểm tra thư mục `public/uploads` có tồn tại không
- Kiểm tra quyền ghi file
- Kiểm tra dung lượng ảnh (nên < 5MB)

### JSON bị lỗi
- Backup file `character_profile.json` trước khi chỉnh sửa
- Sử dụng JSON validator online để kiểm tra syntax
- Khôi phục từ backup nếu cần

## 📈 Phát Triển Tương Lai

### Tính năng có thể thêm:
- [ ] Authentication/Login system
- [ ] Multiple character profiles
- [ ] Export/Import scenes
- [ ] Batch prompt generation
- [ ] Image comparison tool
- [ ] Version history cho character profile
- [ ] Search/Filter scenes
- [ ] Tags cho scenes
- [ ] Favorite scenes
- [ ] Dark/Light theme toggle
- [ ] Database backend (SQLite/PostgreSQL)
- [ ] Cloud storage cho ảnh
- [ ] API integration với AI image generators

## 👨‍💻 Tác Giả

Dự án được phát triển để quản lý nhân vật AI "Linh Trang" cho mục đích tạo ảnh AI với đặc điểm Việt Nam chân thực.

## 📄 License

Private project - All rights reserved.

---

**Lưu ý**: Dự án này được thiết kế để chạy local, không phù hợp cho production deployment mà không có thêm security measures (authentication, input validation, rate limiting, etc.)
