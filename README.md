# EduRide · Quản lý học sinh đi xe đưa rước

Dashboard React + TypeScript + Vite cho năm học 2026–2027, giao diện tiếng Việt, Ant Design, Tailwind CSS, lucide-react và Firebase Cloud Firestore.

## Chạy local

```bash
npm install
npm run dev
```

Build production:

```bash
npm run build
npm run preview
```

## Firebase

Thông tin Firebase mẫu đã được đặt trong `.env` và có bản mẫu tại `.env.example`. Khi Firestore khả dụng, app subscribe realtime hai collection `students` và `vehicles`; khi chưa kết nối hoặc collection chưa có dữ liệu, app dùng mock data và lưu thay đổi vào localStorage.

Trong Firebase Console, tạo Cloud Firestore Database và hai collection:

- `students`: thông tin học sinh, `paymentHistory` dạng `{ "2026-09": "paid", "2026-10": "unpaid" }`.
- `vehicles`: phương tiện, tài xế, tuyến và sức chứa.

## Chức năng

- Dashboard tổng quan với tiến độ Quý 1, Quý 2, Quý 3.
- Thêm/sửa/xóa học sinh, tìm kiếm, lọc, gán xe, drawer chi tiết và export CSV.
- Quản lý đội xe, sức chứa, tỷ lệ lấp đầy, trạng thái hoạt động/bảo trì.
- Cập nhật học phí độc lập theo từng tháng; đủ 3 tháng hiển thị “Hoàn thành quý”.
- Responsive mobile với sidebar drawer.
