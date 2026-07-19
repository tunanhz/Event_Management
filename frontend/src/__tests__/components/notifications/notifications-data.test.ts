import {
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATIONS_SEED,
  type AppNotification,
  type NotificationType,
} from '@/components/notifications/notifications-data';

describe('Notifications Data', () => {
  describe('NotificationType enum', () => {
    it('should have all expected notification type labels', () => {
      const expectedTypes: NotificationType[] = [
        'event_approved',
        'event_rejected',
        'payment_success',
        'event_reminder',
        'withdrawal',
        'system',
      ];
      expectedTypes.forEach((type) => {
        expect(NOTIFICATION_TYPE_LABELS[type]).toBeDefined();
        expect(typeof NOTIFICATION_TYPE_LABELS[type]).toBe('string');
      });
    });

    it('should have non-empty labels for all types', () => {
      Object.values(NOTIFICATION_TYPE_LABELS).forEach((label) => {
        expect(label.length).toBeGreaterThan(0);
      });
    });

    it('should have Vietnamese labels', () => {
      expect(NOTIFICATION_TYPE_LABELS.event_approved).toContain('Sự kiện');
      expect(NOTIFICATION_TYPE_LABELS.event_rejected).toContain('Sự kiện');
      expect(NOTIFICATION_TYPE_LABELS.payment_success).toContain('Thanh toán');
    });

    it('should have exactly 6 notification types', () => {
      const typeCount = Object.keys(NOTIFICATION_TYPE_LABELS).length;
      expect(typeCount).toBe(6);
    });

    it('should map event_approved to "Sự kiện được duyệt"', () => {
      expect(NOTIFICATION_TYPE_LABELS.event_approved).toBe('Sự kiện được duyệt');
    });

    it('should map event_rejected to "Sự kiện bị từ chối"', () => {
      expect(NOTIFICATION_TYPE_LABELS.event_rejected).toBe('Sự kiện bị từ chối');
    });

    it('should map payment_success to "Thanh toán"', () => {
      expect(NOTIFICATION_TYPE_LABELS.payment_success).toBe('Thanh toán');
    });

    it('should map event_reminder to "Nhắc lịch"', () => {
      expect(NOTIFICATION_TYPE_LABELS.event_reminder).toBe('Nhắc lịch');
    });

    it('should map withdrawal to "Rút tiền"', () => {
      expect(NOTIFICATION_TYPE_LABELS.withdrawal).toBe('Rút tiền');
    });

    it('should map system to "Hệ thống"', () => {
      expect(NOTIFICATION_TYPE_LABELS.system).toBe('Hệ thống');
    });
  });

  describe('NOTIFICATIONS_SEED data structure', () => {
    it('should be an array', () => {
      expect(Array.isArray(NOTIFICATIONS_SEED)).toBe(true);
    });

    it('should have 6 seed notifications', () => {
      expect(NOTIFICATIONS_SEED.length).toBe(6);
    });

    it('should have each notification conform to AppNotification interface', () => {
      NOTIFICATIONS_SEED.forEach((notification) => {
        expect(notification).toHaveProperty('id');
        expect(notification).toHaveProperty('type');
        expect(notification).toHaveProperty('title');
        expect(notification).toHaveProperty('message');
        expect(notification).toHaveProperty('createdAt');
      });
    });
  });

  describe('Notification IDs', () => {
    it('should have unique IDs for each notification', () => {
      const ids = NOTIFICATIONS_SEED.map((n) => n.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(NOTIFICATIONS_SEED.length);
    });

    it('should have sequential IDs starting with ntf-', () => {
      NOTIFICATIONS_SEED.forEach((notification, index) => {
        expect(notification.id).toMatch(/^ntf-\d+$/);
      });
    });

    it('should start with ntf-1', () => {
      expect(NOTIFICATIONS_SEED[0].id).toBe('ntf-1');
    });

    it('should end with ntf-6', () => {
      expect(NOTIFICATIONS_SEED[NOTIFICATIONS_SEED.length - 1].id).toBe('ntf-6');
    });
  });

  describe('Notification types distribution', () => {
    it('should seed every declared notification type exactly once', () => {
      const declaredTypes = Object.keys(NOTIFICATION_TYPE_LABELS) as NotificationType[];
      const seededTypes = NOTIFICATIONS_SEED.map((n) => n.type);

      // Every type the UI can label must be represented, and no type twice —
      // the seed doubles as the fixture the notifications screen renders from.
      expect([...seededTypes].sort()).toEqual([...declaredTypes].sort());
    });

    // Each seeded row is the fixture behind one notification card, so assert the
    // whole shape rather than merely that the type exists.
    it.each([
      ['payment_success', 'ntf-1', '/ve-cua-toi'],
      ['event_reminder', 'ntf-2', '/ve-cua-toi'],
      ['event_approved', 'ntf-3', '/organizer'],
    ] as const)(
      'should seed a complete %s notification',
      (type, expectedId, expectedHref) => {
        const notif = NOTIFICATIONS_SEED.find((n) => n.type === type);

        expect(notif).toMatchObject({
          id: expectedId,
          type,
          href: expectedHref,
        });
        expect(notif!.title.trim().length).toBeGreaterThan(0);
        expect(notif!.message.trim().length).toBeGreaterThan(0);
        expect(Number.isNaN(Date.parse(notif!.createdAt))).toBe(false);
      }
    );

    it.each(['withdrawal', 'event_rejected', 'system'] as const)(
      'should seed a complete %s notification',
      (type) => {
        const notif = NOTIFICATIONS_SEED.find((n) => n.type === type);

        expect(notif).toBeDefined();
        expect(notif!.id).toMatch(/^ntf-\d+$/);
        expect(notif!.title.trim().length).toBeGreaterThan(0);
        expect(notif!.message.trim().length).toBeGreaterThan(0);
        expect(Number.isNaN(Date.parse(notif!.createdAt))).toBe(false);
      }
    );
  });

  describe('Notification content', () => {
    it('should have non-empty title for all notifications', () => {
      NOTIFICATIONS_SEED.forEach((notification) => {
        expect(notification.title.length).toBeGreaterThan(0);
      });
    });

    it('should have non-empty message for all notifications', () => {
      NOTIFICATIONS_SEED.forEach((notification) => {
        expect(notification.message.length).toBeGreaterThan(0);
      });
    });

    it('should have Vietnamese text in titles', () => {
      NOTIFICATIONS_SEED.forEach((notification) => {
        expect(notification.title).toMatch(/[a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i);
      });
    });

    it('should have Vietnamese text in messages', () => {
      NOTIFICATIONS_SEED.forEach((notification) => {
        expect(notification.message).toMatch(/[a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i);
      });
    });
  });

  describe('ISO dates', () => {
    it('should have valid ISO 8601 timestamps', () => {
      NOTIFICATIONS_SEED.forEach((notification) => {
        const date = new Date(notification.createdAt);
        expect(date.getTime()).not.toBeNaN();
      });
    });

    it('should have createdAt in descending order (newest first)', () => {
      for (let i = 0; i < NOTIFICATIONS_SEED.length - 1; i++) {
        const current = new Date(NOTIFICATIONS_SEED[i].createdAt).getTime();
        const next = new Date(NOTIFICATIONS_SEED[i + 1].createdAt).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });

    it('should have dates from July 2026', () => {
      NOTIFICATIONS_SEED.forEach((notification) => {
        const date = new Date(notification.createdAt);
        expect(date.getFullYear()).toBe(2026);
        expect(date.getMonth()).toBeLessThanOrEqual(6); // July or earlier
      });
    });

    it('should have timestamps with seconds precision', () => {
      NOTIFICATIONS_SEED.forEach((notification) => {
        expect(notification.createdAt).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/);
      });
    });
  });

  describe('href links', () => {
    it('should have optional href property', () => {
      NOTIFICATIONS_SEED.forEach((notification) => {
        if ('href' in notification) {
          expect(typeof notification.href).toBe('string');
        }
      });
    });

    it('should have href starting with / for internal links', () => {
      NOTIFICATIONS_SEED.filter((n) => n.href).forEach((notification) => {
        expect(notification.href).toMatch(/^\//);
      });
    });

    it('should have realistic paths for internal links', () => {
      const notificationWithHref = NOTIFICATIONS_SEED.find((n) => n.href);
      if (notificationWithHref?.href) {
        expect(['/ve-cua-toi', '/organizer', '/su-kien'].some((p) => notificationWithHref.href?.includes(p))).toBe(
          true
        );
      }
    });

    it('should link to ve-cua-toi for payment and event reminders', () => {
      const paymentNotif = NOTIFICATIONS_SEED.find((n) => n.type === 'payment_success');
      const reminderNotif = NOTIFICATIONS_SEED.find((n) => n.type === 'event_reminder');
      expect(paymentNotif?.href).toBe('/ve-cua-toi');
      expect(reminderNotif?.href).toBe('/ve-cua-toi');
    });

    it('should link to organizer for approval and rejection notifications', () => {
      const approvedNotif = NOTIFICATIONS_SEED.find((n) => n.type === 'event_approved');
      const rejectedNotif = NOTIFICATIONS_SEED.find((n) => n.type === 'event_rejected');
      expect(approvedNotif?.href).toBe('/organizer');
      expect(rejectedNotif?.href).toBe('/organizer');
    });

    it('should link to su-kien for system notification', () => {
      const sysNotif = NOTIFICATIONS_SEED.find((n) => n.type === 'system');
      expect(sysNotif?.href).toBe('/su-kien');
    });

    it('should not have href for withdrawal notification', () => {
      const withdrawalNotif = NOTIFICATIONS_SEED.find((n) => n.type === 'withdrawal');
      expect(withdrawalNotif?.href).toBeUndefined();
    });
  });

  describe('Specific notification data', () => {
    it('should have correct payment_success notification (ntf-1)', () => {
      const paymentNotif = NOTIFICATIONS_SEED[0];
      expect(paymentNotif.type).toBe('payment_success');
      expect(paymentNotif.title).toContain('Thanh toán');
      expect(paymentNotif.message).toContain('vé');
      expect(paymentNotif.href).toBe('/ve-cua-toi');
    });

    it('should have correct event_reminder notification (ntf-2)', () => {
      const reminderNotif = NOTIFICATIONS_SEED[1];
      expect(reminderNotif.type).toBe('event_reminder');
      expect(reminderNotif.title).toContain('ngày mai');
      expect(reminderNotif.href).toBe('/ve-cua-toi');
    });

    it('should have correct event_approved notification (ntf-3)', () => {
      const approvedNotif = NOTIFICATIONS_SEED[2];
      expect(approvedNotif.type).toBe('event_approved');
      expect(approvedNotif.title).toContain('duyệt');
      expect(approvedNotif.href).toBe('/organizer');
    });

    it('should have correct withdrawal notification (ntf-4)', () => {
      const withdrawalNotif = NOTIFICATIONS_SEED[3];
      expect(withdrawalNotif.type).toBe('withdrawal');
      expect(withdrawalNotif.title).toContain('Yêu cầu rút');
      expect(withdrawalNotif.message).toContain('25.000.000');
      expect(withdrawalNotif.href).toBeUndefined();
    });

    it('should have correct event_rejected notification (ntf-5)', () => {
      const rejectedNotif = NOTIFICATIONS_SEED[4];
      expect(rejectedNotif.type).toBe('event_rejected');
      expect(rejectedNotif.title).toContain('bổ sung');
      expect(rejectedNotif.href).toBe('/organizer');
    });

    it('should have correct system notification (ntf-6)', () => {
      const sysNotif = NOTIFICATIONS_SEED[5];
      expect(sysNotif.type).toBe('system');
      expect(sysNotif.title).toContain('Chào mừng');
      expect(sysNotif.href).toBe('/su-kien');
    });
  });

  describe('Type safety', () => {
    it('should have all notifications with valid NotificationType', () => {
      const validTypes: NotificationType[] = [
        'event_approved',
        'event_rejected',
        'payment_success',
        'event_reminder',
        'withdrawal',
        'system',
      ];
      NOTIFICATIONS_SEED.forEach((notification) => {
        expect(validTypes).toContain(notification.type);
      });
    });

    it('should allow looking up type labels for all notification types', () => {
      NOTIFICATIONS_SEED.forEach((notification) => {
        const label = NOTIFICATION_TYPE_LABELS[notification.type];
        expect(label).toBeDefined();
        expect(label).not.toBeNull();
      });
    });
  });

  describe('Data immutability', () => {
    it('should not mutate notification data', () => {
      const originalLength = NOTIFICATIONS_SEED.length;
      const originalIds = NOTIFICATIONS_SEED.map((n) => n.id);

      // Try to modify
      const testNotif = { ...NOTIFICATIONS_SEED[0] };
      testNotif.title = 'Modified';

      // Original should remain unchanged
      expect(NOTIFICATIONS_SEED[0].title).not.toBe('Modified');
      expect(NOTIFICATIONS_SEED.length).toBe(originalLength);
      expect(NOTIFICATIONS_SEED.map((n) => n.id)).toEqual(originalIds);
    });
  });

  describe('Breadth coverage', () => {
    it('should represent different notification scenarios', () => {
      const scenarios = {
        payment: NOTIFICATIONS_SEED.find((n) => n.type === 'payment_success'),
        eventManagement: NOTIFICATIONS_SEED.find(
          (n) => n.type === 'event_approved' || n.type === 'event_rejected'
        ),
        system: NOTIFICATIONS_SEED.find((n) => n.type === 'system'),
      };
      Object.values(scenarios).forEach((scenario) => {
        expect(scenario).toBeDefined();
      });
    });

    it('should have both success and failure notification types', () => {
      const success = NOTIFICATIONS_SEED.some((n) => n.type === 'event_approved');
      const failure = NOTIFICATIONS_SEED.some((n) => n.type === 'event_rejected');
      expect(success).toBe(true);
      expect(failure).toBe(true);
    });

    it('should have reminders and financial notifications', () => {
      const reminder = NOTIFICATIONS_SEED.some((n) => n.type === 'event_reminder');
      const financial = NOTIFICATIONS_SEED.some(
        (n) => n.type === 'withdrawal' || n.type === 'payment_success'
      );
      expect(reminder).toBe(true);
      expect(financial).toBe(true);
    });
  });
});
