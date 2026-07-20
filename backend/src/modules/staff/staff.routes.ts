import { Router } from 'express';
import { StaffController } from './staff.controller';
import { isAuthenticated, authorize } from '../../common/middleware/auth.middleware';

const router = Router();
const staffController = new StaffController();

// Tất cả routes đều yêu cầu đăng nhập
router.use(isAuthenticated as any);

// ─── Staff-only Routes ────────────────────────────────────────────────
// Chỉ STAFF (và ADMIN) mới được truy cập

/** Ca trực của tôi */
router.get(
  '/assignments',
  authorize('STAFF', 'ADMIN') as any,
  staffController.getMyAssignments
);

/** Xác nhận nhận ca */
router.patch(
  '/assignments/:id/confirm',
  authorize('STAFF', 'ADMIN') as any,
  staffController.confirmAssignment
);

/** Check-in bằng mã vé (QR / nhập tay) */
router.post(
  '/check-in',
  authorize('STAFF', 'ADMIN') as any,
  staffController.checkIn
);

/** Live stats check-in của một sự kiện */
router.get(
  '/events/:eventId/checkin-stats',
  authorize('STAFF', 'ADMIN') as any,
  staffController.getCheckInStats
);

/** Lịch sử check-in */
router.get(
  '/events/:eventId/checkin-history',
  authorize('STAFF', 'ADMIN') as any,
  staffController.getCheckInHistory
);

/** Danh sách người tham dự */
router.get(
  '/events/:eventId/attendees',
  authorize('STAFF', 'ADMIN') as any,
  staffController.getAttendees
);

/** Check-in thủ công từ danh sách */
router.post(
  '/events/:eventId/attendees/:registrationId/check-in',
  authorize('STAFF', 'ADMIN') as any,
  staffController.manualCheckIn
);

/** Tạo báo cáo sự cố */
router.post(
  '/incidents',
  authorize('STAFF', 'ADMIN') as any,
  staffController.createIncident
);

/** Danh sách sự cố của staff */
router.get(
  '/incidents',
  authorize('STAFF', 'ADMIN') as any,
  staffController.getMyIncidents
);

/** Chi tiết sự cố */
router.get(
  '/incidents/:id',
  authorize('STAFF', 'ADMIN') as any,
  staffController.getIncidentById
);

export default router;
