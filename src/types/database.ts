// =============================================================================
// 整骨院予約システム - Database Types
// =============================================================================
// All TypeScript types matching the Supabase database schema.
// These types are used throughout the application for type safety.
// =============================================================================

/** 予約ステータス */
export type ReservationStatus = 'reserved' | 'visited' | 'cancelled' | 'no_show';

/** LINE通知タイプ */
export type LineNotificationType = 'confirm' | 'remind' | 'cancel';

/** スタッフ役割 */
export type StaffRole = 'admin' | 'staff' | 'practitioner';

/** 曜日 (0=日曜日, 1=月曜日, ..., 6=土曜日) */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// -----------------------------------------------------------------------------
// Row Types (データベースから取得した行の型)
// -----------------------------------------------------------------------------

/** 患者 */
export interface Patient {
  id: string;
  name: string;
  phone: string;
  birth_date: string | null;
  pin_code: string;
  line_user_id: string | null;
  memo: string | null;
  created_at: string;
}

/** 施術者 */
export interface Practitioner {
  id: string;
  name: string;
  photo_url: string | null;
  bio: string | null;
  specialties: string[] | null;
  is_active: boolean;
  created_at: string;
}

/** 施術メニュー */
export interface Menu {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_estimate: number | null;
  icon: string | null;
  sort_order: number;
  is_published: boolean;
}

/** 施術者×メニュー 中間テーブル */
export interface PractitionerMenu {
  practitioner_id: string;
  menu_id: string;
}

/** シフト・スケジュール */
export interface Schedule {
  id: string;
  practitioner_id: string;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  is_available: boolean;
  specific_date: string | null;
  is_holiday: boolean;
}

/** 予約 */
export interface Reservation {
  id: string;
  patient_id: string;
  practitioner_id: string;
  menu_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: ReservationStatus;
  created_at: string;
  updated_at: string;
}

/** LINE通知ログ */
export interface LineNotification {
  id: string;
  reservation_id: string;
  type: LineNotificationType;
  sent_at: string;
  status: string;
}

/** 管理スタッフ */
export interface Staff {
  id: string;
  login_id: string;
  password_hash: string;
  name: string;
  role: StaffRole;
  practitioner_id: string | null;
}

// -----------------------------------------------------------------------------
// Insert Types (新規作成時の型 - id や created_at は省略可)
// -----------------------------------------------------------------------------

export type PatientInsert = Omit<Patient, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export type PractitionerInsert = Omit<Practitioner, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export type MenuInsert = Omit<Menu, 'id'> & {
  id?: string;
};

export type ScheduleInsert = Omit<Schedule, 'id'> & {
  id?: string;
};

export type ReservationInsert = Omit<Reservation, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type LineNotificationInsert = Omit<LineNotification, 'id'> & {
  id?: string;
};

export type StaffInsert = Omit<Staff, 'id'> & {
  id?: string;
};

// -----------------------------------------------------------------------------
// Update Types (更新時の型 - 全フィールドが任意)
// -----------------------------------------------------------------------------

export type PatientUpdate = Partial<Omit<Patient, 'id'>>;
export type PractitionerUpdate = Partial<Omit<Practitioner, 'id'>>;
export type MenuUpdate = Partial<Omit<Menu, 'id'>>;
export type ScheduleUpdate = Partial<Omit<Schedule, 'id'>>;
export type ReservationUpdate = Partial<Omit<Reservation, 'id'>>;
export type StaffUpdate = Partial<Omit<Staff, 'id'>>;

// -----------------------------------------------------------------------------
// Database Type (Supabase クライアントの型定義)
// -----------------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      patients: {
        Row: Patient;
        Insert: PatientInsert;
        Update: PatientUpdate;
      };
      practitioners: {
        Row: Practitioner;
        Insert: PractitionerInsert;
        Update: PractitionerUpdate;
      };
      menus: {
        Row: Menu;
        Insert: MenuInsert;
        Update: MenuUpdate;
      };
      practitioner_menus: {
        Row: PractitionerMenu;
        Insert: PractitionerMenu;
        Update: Partial<PractitionerMenu>;
      };
      schedules: {
        Row: Schedule;
        Insert: ScheduleInsert;
        Update: ScheduleUpdate;
      };
      reservations: {
        Row: Reservation;
        Insert: ReservationInsert;
        Update: ReservationUpdate;
      };
      line_notifications: {
        Row: LineNotification;
        Insert: LineNotificationInsert;
        Update: Partial<Omit<LineNotification, 'id'>>;
      };
      staff: {
        Row: Staff;
        Insert: StaffInsert;
        Update: StaffUpdate;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      reservation_status: ReservationStatus;
      line_notification_type: LineNotificationType;
      staff_role: StaffRole;
    };
  };
}

// -----------------------------------------------------------------------------
// Joined / Enriched Types (リレーション付きの型)
// -----------------------------------------------------------------------------

/** 予約 + リレーション情報 */
export interface ReservationWithDetails extends Reservation {
  patient: Patient;
  practitioner: Practitioner;
  menu: Menu;
}

/** 施術者 + 対応メニュー */
export interface PractitionerWithMenus extends Practitioner {
  menus: Menu[];
}

/** 施術者 + スケジュール */
export interface PractitionerWithSchedules extends Practitioner {
  schedules: Schedule[];
}
