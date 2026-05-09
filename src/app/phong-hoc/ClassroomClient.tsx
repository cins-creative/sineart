"use client";

import {
  CLASSROOM_SESSION_CHANGED_EVENT,
  CLASSROOM_SESSION_STORAGE_KEY,
  parseClassroomSession,
  saveClassroomSession,
  syncPhongHocCookiesWithStorage,
  type ClassroomSessionRecord,
} from "@/lib/phong-hoc/classroom-session";
import {
  GV_DIEM_DANH_POLL_INTERVAL_MS,
  HV_DIEM_DANH_HEARTBEAT_INTERVAL_MS,
  hvPresenceIsLive,
  parseIsoToUtcMs,
  vnCalendarDateString,
} from "@/lib/phong-hoc/diem-danh";
import {
  classmateEnrollmentShouldHighlightNew,
  enrollmentHighlightNewFromIso,
  fetchClassmatesForLop,
  formatClassmateEnrollmentStudyLine,
  type ClassmateListRow,
} from "@/lib/phong-hoc/classmates-for-lop";
import {
  curriculumProgressIndex,
  fetchLopCurriculumExercises,
  formatLessonLabel,
  type LopCurriculumExercise,
} from "@/lib/phong-hoc/lop-curriculum";
import {
  apiFetchHvChatboxMessages,
  apiInsertHvChatboxMessage,
  chatCacheKey,
  chatSubjectColor,
  fetchChatExerciseIndex,
  fetchChatStudentMapByQlhv,
  fetchHvChatboxMessagesWithLopColumn,
  formatChatTime,
  mapChatboxRow,
  parseQlhvKey,
  type ChatExerciseEntry,
  type ChatStudentMapEntry,
  type HvChatboxRow,
} from "@/lib/phong-hoc/hv-chatbox";
import {
  fetchLopHocMeetRow,
  lopMeetRowFromRealtimeNewRow,
  patchLopHocGoogleMeetUrl,
  studentVisibleGoogleMeetUrl,
  type LopHocMeetRow,
} from "@/lib/phong-hoc/lop-hoc-meet-fields";
import {
  buildExerciseModel,
  fetchExercisesForManage,
  fetchTenMonHocForLop,
  type ExerciseItem,
  type StudentManageRow,
} from "@/lib/phong-hoc/student-manage-data";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { isRenderableAdImageUrl } from "@/lib/admin/home-content-schema";
import {
  normalizePhongHocPathSlug,
  phongHocSlugFromClassName,
} from "@/lib/phong-hoc/classroom-url";
import {
  persistTeacherSavedChatMessageId,
  readTeacherSavedChatMessageIds,
} from "@/lib/phong-hoc/chat-saved-student-work-ids";
import { buildHeThongBaiTapHref } from "@/lib/he-thong-bai-tap/slug";
import { cfImageForLightbox, cfImageForThumbnail } from "@/lib/cfImageUrl";
import { postUploadChatImage } from "@/lib/chat-image-upload-client";
import {
  ALL_SAMPLES_PAGE_SIZE,
  classroomGalleryEmoji,
  fetchAllSampleWorks,
  fetchBaiMauSamplesForExercise,
  fetchClassroomGalleryForLop,
  type StudentProfileGalleryRow,
} from "@/lib/phong-hoc/classroom-gallery";
import ClassroomSignInOverlay from "@/app/_components/ClassroomSignInOverlay";
import StudentAvatarMenu from "@/components/StudentAvatarMenu";
import type { RealtimeChannel } from "@supabase/supabase-js";
import Link from "next/link";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { Be_Vietnam_Pro, Quicksand } from "next/font/google";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
} from "react";
import "../donghocphi/donghocphi.css";
import "./phong-hoc-ui.css";
import StudentManageLessonPicker from "./StudentManageLessonPicker";
import StudentManageModal from "./StudentManageModal";

function cx(...parts: Array<string | false | undefined | null>): string {
  return parts.filter(Boolean).join(" ");
}

const PHC_SIDEBAR_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const PHC_SIDEBAR_TWEEN = { type: "tween" as const, duration: 0.48, ease: PHC_SIDEBAR_EASE };

const HV_CHAT_INITIAL = 30;
const HV_CHAT_LOAD_MORE = 20;
const HV_CHAT_MAX_IMAGES = 12;

/** Vòng tiến độ bài (theo prototype Class_Chatbox). GV có thể bấm để mở gán tiến độ. */
function ChatMiniRing({
  order,
  total,
  color,
  onTeacherPickProgress,
}: {
  order: number;
  total: number;
  color: string;
  /** Chỉ truyền khi đang là giáo viên — bọc nút, mở bảng chọn bài. */
  onTeacherPickProgress?: () => void;
}) {
  const pct = total > 0 ? Math.min(order / total, 1) : 0;
  const R = 10;
  const sw = 2.5;
  const size = 26;
  const circ = 2 * Math.PI * R;
  const wrapStyle: CSSProperties = {
    position: "relative",
    width: size,
    height: size,
    flexShrink: 0,
  };
  const inner = (
    <>
      <svg
        width={size}
        height={size}
        viewBox="0 0 26 26"
        style={{ transform: "rotate(-90deg)", position: "absolute", inset: 0 }}
        aria-hidden
      >
        <circle cx="13" cy="13" r={R} fill="none" stroke="#e5e7eb" strokeWidth={sw} />
        <circle
          cx="13"
          cy="13"
          r={R}
          fill="none"
          stroke={order > 0 ? color : "#e5e7eb"}
          strokeWidth={sw}
          strokeDasharray={`${pct * circ} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.5s ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: 7,
            fontWeight: 800,
            color: order > 0 ? color : "#d1d5db",
            lineHeight: 1,
          }}
        >
          {order > 0 ? order : "—"}
        </span>
        {order > 0 ? (
          <span style={{ fontSize: 6, color: `${color}99`, lineHeight: 1 }}>/{total}</span>
        ) : null}
      </div>
    </>
  );
  if (onTeacherPickProgress) {
    return (
      <button
        type="button"
        className="chat-mini-ring-wrap chat-mini-ring--btn"
        style={wrapStyle}
        onClick={(e) => {
          e.stopPropagation();
          onTeacherPickProgress();
        }}
        title="Gán tiến độ bài cho học viên"
        aria-label="Gán tiến độ bài cho học viên"
      >
        {inner}
      </button>
    );
  }
  return (
    <div className="chat-mini-ring-wrap" style={wrapStyle}>
      {inner}
    </div>
  );
}

/** Ảnh `hr_nhan_su.avatar` hoặc chữ cái trên nền gradient. */
function PhcAvatarBubble({
  name,
  photoUrl,
  className,
  gradientVar,
  ariaHiddenLetter = true,
}: {
  name: string;
  photoUrl: string | null | undefined;
  className: string;
  gradientVar: string;
  ariaHiddenLetter?: boolean;
}) {
  const url = photoUrl?.trim();
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  if (url) {
    return (
      <div className={cx(className, "phc-avatar--photo")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="phc-avatar__img" />
      </div>
    );
  }
  return (
    <div className={className} style={{ background: gradientVar }} aria-hidden={ariaHiddenLetter}>
      {initial}
    </div>
  );
}

/** Chuẩn hoá URL phòng họp (DB có thể thiếu https://). */
function normalizeMeetingRoomUrl(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  if (/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}/i.test(t)) return `https://${t}`;
  return null;
}

const fontBody = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});
const fontTitle = Quicksand({ subsets: ["latin"], weight: ["600", "700"] });

type Role = "teacher" | "student";

type ChatMsg = {
  id: number;
  usertype: "Student" | "Teacher";
  name: string;
  /** Màu avatar học viên */
  colorHex: string;
  content: string;
  time: string;
};

/** Các cặp trường–ngành hiển thị thẻ HV (ưu tiên `truong_nganh_pairs`, fallback session cũ). */
function panelTruongNganhPairs(p: {
  truong_nganh_pairs?: { truong: string; nganh: string }[];
  truong_dai_hoc?: string;
  nganh_dao_tao?: string;
}): { truong: string; nganh: string }[] {
  if (p.truong_nganh_pairs && p.truong_nganh_pairs.length > 0) return p.truong_nganh_pairs;
  const t = p.truong_dai_hoc?.trim() ?? "";
  const n = p.nganh_dao_tao?.trim() ?? "";
  if (t || n) return [{ truong: t || "—", nganh: n || "—" }];
  return [];
}

/** Demo khi không có session GV; cùng shape với `ClassmateListRow` từ DB. */
type StudentRow = ClassmateListRow;

type Artwork = {
  /** `hv_bai_hoc_vien.id` — ≤0 = demo seed */
  hvId: number;
  /** `ql_thong_tin_hoc_vien.id` */
  ownerStudentId: number | null;
  n: string;
  cls: string;
  mau: boolean;
  e: string;
  score: number | null;
  photo: string | null;
  exerciseId: number | null;
  exerciseLabel: string | null;
  exerciseOrder: number | null;
  exerciseTitle: string | null;
  monHocId?: number | null;
  tenMonHoc?: string | null;
};

/** Dữ liệu demo khi chưa đăng nhập qua modal “Vào học” */
const SESSIONS = {
  teacher: {
    userType: "Teacher" as const,
    data: {
      full_name: "Nguyễn Thành Tú",
      email: "tu@sineart.vn",
      lop_hoc_id: 1,
      teacher_name: "Thầy Tú",
      class_name: "SA01",
      /** Demo: để trống → chữ cái; có thể dán URL ảnh Cloudflare để thử. */
      avatar: "" as string,
      meeting_room: null as string | null,
    },
  },
  student: {
    userType: "Student" as const,
    data: {
      full_name: "Minh Anh",
      email: "minhanh@gmail.com",
      lop_hoc_id: 1,
      class_name: "SA01",
      days_remaining: 12,
      nganh_dao_tao: "Thiết kế đồ họa",
      truong_dai_hoc: "ĐH Mỹ Thuật TPHCM",
      truong_nganh_pairs: [
        { truong: "ĐH Mỹ Thuật TPHCM", nganh: "Thiết kế đồ họa" },
        { truong: "ĐH Kiến trúc TP.HCM", nganh: "Mỹ thuật công nghiệp" },
      ],
      ngay_ket_thuc: "2025-06-30",
      teacher_name: "Thầy Tú",
      nam_thi: 2025,
      meeting_room: null as string | null,
    },
  },
};

const STUDENTS_MOCK: StudentRow[] = (() => {
  const isoDaysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
  return [
    {
      enrollmentId: 800001,
      hvId: 900001,
      n: "Minh Anh",
      i: "M",
      c: "#4f8ef7",
      st: true,
      sub: true,
      ex: "Bài 3.2",
      exTitle: "Thực hành tông màu",
      exMon: "Trang trí màu",
      enrollmentCreatedAt: isoDaysAgo(3),
    },
    {
      enrollmentId: 800002,
      hvId: 900002,
      n: "Hà Linh",
      i: "H",
      c: "#f6ad55",
      st: true,
      sub: true,
      ex: "Bài 2.5",
      exTitle: "Phối cảnh không gian",
      exMon: "Hình họa",
      enrollmentCreatedAt: isoDaysAgo(400),
    },
    {
      enrollmentId: 800003,
      hvId: 900003,
      n: "Tuấn Kiệt",
      i: "T",
      c: "#48bb78",
      st: "late",
      sub: false,
      ex: "Bài 1.8",
      exTitle: "Bài tập chân dung",
      exMon: "Trang trí màu",
      enrollmentCreatedAt: isoDaysAgo(14),
    },
    {
      enrollmentId: 800004,
      hvId: 900004,
      n: "Phương Vy",
      i: "P",
      c: "#f87171",
      st: true,
      sub: true,
      ex: "Bài 3.1",
      exTitle: "Hoàn thiện đề tài",
      exMon: "Trang trí màu",
      enrollmentCreatedAt: isoDaysAgo(90),
    },
    {
      enrollmentId: 800005,
      hvId: 900005,
      n: "Khải Minh",
      i: "K",
      c: "#a78bfa",
      st: false,
      sub: false,
      ex: null,
      exTitle: null,
      exMon: null,
      enrollmentCreatedAt: null,
    },
  ];
})();

const CHAT_SEED: ChatMsg[] = [
  {
    id: 1,
    usertype: "Student",
    name: "Minh Anh",
    colorHex: "#4f8ef7",
    content: "Thầy ơi màu nền em chọn sai rồi ạ 😅",
    time: "09:14",
  },
  {
    id: 2,
    usertype: "Student",
    name: "Hà Linh",
    colorHex: "#f6ad55",
    content: "Em vẽ xong rồi thầy ✋",
    time: "09:15",
  },
  {
    id: 3,
    usertype: "Teacher",
    name: "Giáo viên",
    colorHex: "#BC8AF9",
    content: "Okay Hà Linh, thầy xem nhé!",
    time: "09:16",
  },
  {
    id: 4,
    usertype: "Student",
    name: "Tuấn Kiệt",
    colorHex: "#48bb78",
    content: "Thầy cho em hỏi dùng brush nào ạ?",
    time: "09:17",
  },
];

const ARTWORKS_SEED: Artwork[] = [
  {
    hvId: -1,
    ownerStudentId: null,
    n: "Minh Anh",
    cls: "SA01",
    mau: false,
    e: "🎨",
    score: 8.5,
    photo: null,
    exerciseId: null,
    exerciseLabel: null,
    exerciseOrder: null,
    exerciseTitle: null,
  },
  {
    hvId: -2,
    ownerStudentId: null,
    n: "Hà Linh",
    cls: "SA01",
    mau: true,
    e: "🖌️",
    score: 9.0,
    photo: null,
    exerciseId: null,
    exerciseLabel: null,
    exerciseOrder: null,
    exerciseTitle: null,
  },
  {
    hvId: -3,
    ownerStudentId: null,
    n: "Phương Vy",
    cls: "SA02",
    mau: false,
    e: "✏️",
    score: 7.5,
    photo: null,
    exerciseId: null,
    exerciseLabel: null,
    exerciseOrder: null,
    exerciseTitle: null,
  },
  {
    hvId: -4,
    ownerStudentId: null,
    n: "Tuấn Kiệt",
    cls: "SA01",
    mau: false,
    e: "🎭",
    score: null,
    photo: null,
    exerciseId: null,
    exerciseLabel: null,
    exerciseOrder: null,
    exerciseTitle: null,
  },
  {
    hvId: -5,
    ownerStudentId: null,
    n: "Khải Minh",
    cls: "SA02",
    mau: true,
    e: "🖼️",
    score: 8.0,
    photo: null,
    exerciseId: null,
    exerciseLabel: null,
    exerciseOrder: null,
    exerciseTitle: null,
  },
  {
    hvId: -6,
    ownerStudentId: null,
    n: "Lan Anh",
    cls: "SA03",
    mau: false,
    e: "🌸",
    score: 7.0,
    photo: null,
    exerciseId: null,
    exerciseLabel: null,
    exerciseOrder: null,
    exerciseTitle: null,
  },
];

type TabId = "lop" | "chat" | "third" | "gallery";

type ChatProgressPickerState =
  | null
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | {
      phase: "ready";
      data: {
        student: StudentManageRow;
        exBySubject: Record<string, ExerciseItem[]>;
        allSubjects: string[];
        lopTenMonHoc: string | null;
        filterSubjectFallback: string;
      };
    };

type PanelData = {
  full_name: string;
  email: string;
  lop_hoc_id: number;
  teacher_name: string;
  class_name: string;
  /** `hr_nhan_su.avatar` — chỉ khi đăng nhập với tài khoản giáo viên. */
  staff_avatar_url: string | null;
  /** `ql_lop_hoc.meeting_room` */
  meeting_room?: string | null;
  days_remaining?: number | null;
  nganh_dao_tao?: string;
  truong_dai_hoc?: string;
  truong_nganh_pairs?: { truong: string; nganh: string }[];
  ngay_ket_thuc?: string | null;
  nam_thi?: number | null;
};

type ClassroomClientProps = {
  /** `ql_lop_hoc.class_name` → slug đường dẫn (vd. `ttm_03`). Bỏ trống = `/phong-hoc`. */
  classSlug?: string;
  /** URL ảnh quảng cáo đến từ `mkt_home_content.ads`. Rỗng = ẩn hẳn banner. */
  adImageUrl?: string;
};

type MediaPermissionState = "idle" | "checking" | "granted" | "denied" | "unsupported";

function MediaPermissionControl() {
  const [state, setState] = useState<MediaPermissionState>("idle");
  const [message, setMessage] = useState(
    "Bấm để kiểm tra camera và micro trước khi vào lớp.",
  );
  const [open, setOpen] = useState(false);

  const checkPermissions = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState("unsupported");
      setMessage("Trình duyệt này không hỗ trợ kiểm tra camera/micro.");
      setOpen(true);
      return;
    }

    setState("checking");
    setMessage("Đang mở hộp thoại xin quyền camera và micro...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      stream.getTracks().forEach((track) => track.stop());
      setState("granted");
      setMessage("Camera và micro đã sẵn sàng.");
      setOpen(false);
    } catch {
      setState("denied");
      setMessage(
        "Camera hoặc micro đang bị chặn. Hãy bấm biểu tượng ổ khóa/camera cạnh địa chỉ web, chọn Allow/Cho phép cho Camera và Microphone, rồi tải lại trang.",
      );
      setOpen(true);
    }
  }, []);

  return (
    <div className={cx("media-check", open && "is-open", `is-${state}`)}>
      <button
        type="button"
        className="media-check-btn"
        onClick={checkPermissions}
        disabled={state === "checking"}
        aria-expanded={open}
      >
        <span className="media-check-dot" aria-hidden />
        {state === "checking"
          ? "Đang kiểm tra..."
          : state === "granted"
            ? "Cam/mic OK"
            : "Kiểm tra cam/mic"}
      </button>
      {open ? (
        <div className="media-check-pop" role="status">
          <div className="media-check-title">
            {state === "denied" ? "Cần bật quyền trình duyệt" : "Camera & micro"}
          </div>
          <p>{message}</p>
          {state === "denied" ? (
            <ol>
              <li>Bấm biểu tượng ổ khóa/camera trên thanh địa chỉ.</li>
              <li>Đổi Camera và Microphone sang Allow/Cho phép.</li>
              <li>Reload trang phòng học rồi bấm kiểm tra lại.</li>
            </ol>
          ) : null}
          <button
            type="button"
            className="media-check-close"
            onClick={() => setOpen(false)}
          >
            Đã hiểu
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function ClassroomClient({
  classSlug,
  adImageUrl = "",
}: ClassroomClientProps = {}) {
  const router = useRouter();
  const adSrc = adImageUrl.trim();
  const hasAdImage = isRenderableAdImageUrl(adSrc);
  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState<Role>("student");
  const [storedSession, setStoredSession] = useState<ClassroomSessionRecord | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tab, setTab] = useState<TabId>("lop");
  /** Google Meet (`ql_lop_hoc.url_google_meet`) — iPad/GV: meet.new + paste; học viên mở cùng link trong ngày (VN). */
  const [googleMeetUrl, setGoogleMeetUrl] = useState<string | null>(null);
  /** Mốc lưu link (DB `url_google_meet_set_at`) — reset hiển thị HV sau 24:00 theo ngày VN. */
  const [googleMeetSetAt, setGoogleMeetSetAt] = useState<string | null>(null);
  const [lopDevice, setLopDevice] = useState<string | null>(null);
  const [gmeetRowReady, setGmeetRowReady] = useState(false);
  const [gmeetFormOpen, setGmeetFormOpen] = useState(false);
  const [gmeetInput, setGmeetInput] = useState("");
  const [gmeetSaving, setGmeetSaving] = useState(false);
  const [gmeetJustSaved, setGmeetJustSaved] = useState(false);
  /** Quảng cáo: banner → thu gọn nút «Quảng cáo» → ẩn hẳn (reload trang = về banner). */
  const [adDismissal, setAdDismissal] = useState<"banner" | "pill" | "none">("banner");
  /** Lightbox lưu trực tiếp `Artwork` (không lưu index) — vì source có thể đổi giữa `artworks` và `globalSamples`. */
  const [lightbox, setLightbox] = useState<Artwork | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>(CHAT_SEED);
  /** Tin nhắn thật từ `hv_chatbox` (mới nhất đầu mảng — khớp `column-reverse` trong CSS). */
  const [hvChatRows, setHvChatRows] = useState<HvChatboxRow[]>([]);
  const [hvChatVisibleCount, setHvChatVisibleCount] = useState(HV_CHAT_INITIAL);
  const [hvChatLoadingMore, setHvChatLoadingMore] = useState(false);
  const [hvChatSending, setHvChatSending] = useState(false);
  const [hvChatErr, setHvChatErr] = useState<string | null>(null);
  const [chatStudentByQlhv, setChatStudentByQlhv] = useState<Record<number, ChatStudentMapEntry>>(
    {}
  );
  const [chatExMap, setChatExMap] = useState<Record<number, ChatExerciseEntry>>({});
  const [chatTotalByMon, setChatTotalByMon] = useState<Record<string, number>>({});
  const [chatClassTeacherAvatarUrl, setChatClassTeacherAvatarUrl] = useState<string | null>(null);
  /** Ảnh chưa gửi: chọn file / dán clipboard — tối đa `HV_CHAT_MAX_IMAGES`. */
  const [chatPendingImages, setChatPendingImages] = useState<
    { key: string; file: File; previewUrl: string }[]
  >([]);
  const [chatFullImg, setChatFullImg] = useState<string | null>(null);
  /** Tin chat đang gọi API lưu bài (giáo viên). */
  const [teacherSaveChatBusy, setTeacherSaveChatBusy] = useState<Record<number, boolean>>({});
  /** Tin chat đã lưu thành công vào `hv_bai_hoc_vien` (theo id tin `hv_chatbox`). */
  const [teacherChatSaved, setTeacherChatSaved] = useState<Record<number, boolean>>({});
  /** Thông báo ngắn sau khi lưu (aria-live). */
  const [teacherSaveChatNotice, setTeacherSaveChatNotice] = useState<string | null>(null);
  const [chatDraft, setChatDraft] = useState("");
  const [gFilter, setGFilter] = useState<"mine" | "class">("class");
  /** Lọc theo loại tranh — "hv" = bài học viên, "mau" = bài mẫu (`bai_mau`). Default = mau. */
  const [gWorkKind, setGWorkKind] = useState<"hv" | "mau">("mau");
  const [gExerciseFilter, setGExerciseFilter] = useState<string>("all");
  const [artworks, setArtworks] = useState<Artwork[]>(ARTWORKS_SEED);
  const [galleryLoading, setGalleryLoading] = useState(false);
  /** Toàn bộ bài mẫu (`bai_mau = true`) trên hệ thống — lazy-load + pagination khi vào tab «Bài mẫu». */
  const [globalSamples, setGlobalSamples] = useState<Artwork[]>([]);
  const [globalSamplesLoading, setGlobalSamplesLoading] = useState(false);
  const [globalSamplesLoaded, setGlobalSamplesLoaded] = useState(false);
  const [globalSamplesLoadingMore, setGlobalSamplesLoadingMore] = useState(false);
  const [globalSamplesHasMore, setGlobalSamplesHasMore] = useState(false);
  /** `ql_mon_hoc.id` của lớp — lọc tab «Bài mẫu» theo môn lớp; null = lớp không gán môn → không lọc. */
  const [lopMonHocIdForSamples, setLopMonHocIdForSamples] = useState<number | null>(null);
  const [lopTenMonHocLabel, setLopTenMonHocLabel] = useState<string | null>(null);
  /** Đã đọc `ql_lop_hoc.mon_hoc` (hoặc không có lớp) — tránh fetch bài mẫu trước khi biết có lọc môn hay không. */
  const [lopSamplesMonReady, setLopSamplesMonReady] = useState(false);
  /** GV + Bài mẫu + đã chọn đúng một bài: danh sách đầy đủ theo bài (đồng bộ tab «Bài mẫu» trên `/he-thong-bai-tap/[slug]`). */
  const [mauExerciseSamples, setMauExerciseSamples] = useState<Artwork[] | null>(null);
  const [mauExerciseLoading, setMauExerciseLoading] = useState(false);
  /** GV — ô lọc gallery: toàn bộ bài thuộc môn lớp (`fetchLopCurriculumExercises`), không chỉ bài đã có tranh. */
  const [galleryLopExercises, setGalleryLopExercises] = useState<LopCurriculumExercise[]>([]);
  const [dark, setDark] = useState(false);
  /** `undefined` = chưa tải; có session GV thì sau fetch là danh sách `ql_quan_ly_hoc_vien` + hồ sơ. */
  const [classmatesReal, setClassmatesReal] = useState<ClassmateListRow[] | undefined>(undefined);
  /** GV poll: `hoc_vien_id` → `last_seen_at` (UTC ms). Chỉ coi «online» khi còn mới (heartbeat HV). */
  const [dbLastSeenMsByHvId, setDbLastSeenMsByHvId] = useState<Map<number, number>>(() => new Map());
  /** Làm UI GV cập nhật trạng thái xám khi hết cửa sổ hiệu lực presence (không cần chờ poll). */
  const [presenceUiTick, setPresenceUiTick] = useState(0);
  /** Session cũ có thể thiếu `data.id` — tra `hoc_vien_id` qua `qlhv_id` cho chat/gallery. */
  const [hvStudentPkResolved, setHvStudentPkResolved] = useState<number | null>(null);
  const [studentManageOpen, setStudentManageOpen] = useState(false);
  const [chatProgressPicker, setChatProgressPicker] = useState<ChatProgressPickerState>(null);
  /** Màn «không vào được lớp»: mở lại bảng đăng nhập như nút «Vào học» trên NavBar. */
  const [accessDeniedSignInOpen, setAccessDeniedSignInOpen] = useState(false);
  /** Tab «Bài tập» (học viên): chương trình môn lớp + `tien_do_hoc` để khóa bài. */
  const [stuCurrExercises, setStuCurrExercises] = useState<LopCurriculumExercise[]>([]);
  const [stuCurrSubject, setStuCurrSubject] = useState<string | null>(null);
  const [stuCurrMonId, setStuCurrMonId] = useState<number | null>(null);
  const [stuCurrLoading, setStuCurrLoading] = useState(false);
  const [stuCurrErr, setStuCurrErr] = useState<string | null>(null);
  const [stuCurrTienDo, setStuCurrTienDo] = useState<number | null>(null);
  const [taskDetailOpenId, setTaskDetailOpenId] = useState<number | null>(null);
  /** GV: thêm bài mẫu vào gallery lớp (paste URL hoặc upload → Cloudflare). */
  const [baiMauModalOpen, setBaiMauModalOpen] = useState(false);
  const [baiMauExercises, setBaiMauExercises] = useState<LopCurriculumExercise[]>([]);
  const [baiMauExercisesLoading, setBaiMauExercisesLoading] = useState(false);
  const [baiMauExerciseId, setBaiMauExerciseId] = useState("");
  const [baiMauPhotoUrl, setBaiMauPhotoUrl] = useState("");
  const [baiMauPreviewUrl, setBaiMauPreviewUrl] = useState<string | null>(null);
  const [baiMauSaving, setBaiMauSaving] = useState(false);
  const [baiMauErr, setBaiMauErr] = useState<string | null>(null);
  const [baiMauUploading, setBaiMauUploading] = useState(false);

  const gmeetSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Timer id (DOM `window.setTimeout`). */
  const teacherSaveToastTimerRef = useRef<number | null>(null);
  const hvKnownIdsRef = useRef<Set<number>>(new Set());
  const hvLatestCreatedAtRef = useRef<string>("");
  const myQlhvIdRef = useRef<number | null>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const baiMauFileInputRef = useRef<HTMLInputElement>(null);
  /** Sentinel «Tải thêm» cho gallery samples — IntersectionObserver tự kích hoạt khi cuộn xuống. */
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
  /** Realtime `hv_chatbox` — gỡ bằng `supabase.removeChannel` khi unmount / đổi lớp. */
  const hvChatRealtimeChannelRef = useRef<RealtimeChannel | null>(null);
  /** Realtime `ql_lop_hoc` — Google Meet cập nhật ngay khi GV lưu. */
  const lopMeetRealtimeChannelRef = useRef<RealtimeChannel | null>(null);
  /** Tránh async fetch/subscribe cũ ghi đè sau khi đổi lớp / unmount. */
  const hvChatEffectGenerationRef = useRef(0);

  const browserSb = useMemo(() => createBrowserSupabaseClient(), []);

  const appendChatImageFiles = useCallback((incoming: File[]) => {
    const imageFiles = incoming.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) return;
    setChatPendingImages((prev) => {
      const room = HV_CHAT_MAX_IMAGES - prev.length;
      if (room <= 0) return prev;
      const take = imageFiles.slice(0, room);
      return [
        ...prev,
        ...take.map((file) => ({
          key: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          file,
          previewUrl: URL.createObjectURL(file),
        })),
      ];
    });
  }, []);

  const removeChatPendingImage = useCallback((key: string) => {
    setChatPendingImages((prev) => {
      const hit = prev.find((p) => p.key === key);
      if (hit?.previewUrl.startsWith("blob:")) URL.revokeObjectURL(hit.previewUrl);
      return prev.filter((p) => p.key !== key);
    });
  }, []);

  useEffect(() => {
    try {
      if (localStorage.getItem("phc_dark") === "1") setDark(true);
    } catch {
      /* ignore */
    }
  }, []);

  const chatPendingImagesRef = useRef(chatPendingImages);
  chatPendingImagesRef.current = chatPendingImages;
  useEffect(() => {
    return () => {
      for (const p of chatPendingImagesRef.current) {
        if (p.previewUrl.startsWith("blob:")) URL.revokeObjectURL(p.previewUrl);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (teacherSaveToastTimerRef.current) clearTimeout(teacherSaveToastTimerRef.current);
    };
  }, []);

  const hydrateSessionFromStorage = useCallback(() => {
    const parsed = parseClassroomSession(
      typeof window !== "undefined" ? localStorage.getItem(CLASSROOM_SESSION_STORAGE_KEY) : null
    );
    if (parsed) {
      setStoredSession(parsed);
      setRole(parsed.userType === "Teacher" ? "teacher" : "student");
    } else {
      setStoredSession(null);
    }
  }, []);

  useEffect(() => {
    hydrateSessionFromStorage();
    setMounted(true);
  }, [hydrateSessionFromStorage]);

  useEffect(() => {
    const onSessionChanged = () => hydrateSessionFromStorage();
    window.addEventListener(CLASSROOM_SESSION_CHANGED_EVENT, onSessionChanged);
    const onStorage = (e: StorageEvent) => {
      if (e.key === CLASSROOM_SESSION_STORAGE_KEY || e.key === null) hydrateSessionFromStorage();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CLASSROOM_SESSION_CHANGED_EVENT, onSessionChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, [hydrateSessionFromStorage]);

  /** Không có NavBar trên route Phòng học — đặt cookie `sine_hv_sync` / `sine_gv_sync` để API điểm danh nhận HV/GV. */
  useEffect(() => {
    if (!mounted || !storedSession) return;
    void syncPhongHocCookiesWithStorage();
  }, [mounted, storedSession]);

  useEffect(() => {
    if (storedSession?.userType !== "Teacher") {
      setClassmatesReal(undefined);
      return;
    }
    const lopId = storedSession.data.lop_hoc_id;
    if (!Number.isFinite(lopId)) {
      setClassmatesReal(undefined);
      return;
    }
    let cancelled = false;
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setClassmatesReal([]);
      return;
    }
    void fetchClassmatesForLop(supabase, lopId).then((rows) => {
      if (!cancelled) setClassmatesReal(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [storedSession]);

  const refetchTeacherClassmates = useCallback(() => {
    if (storedSession?.userType !== "Teacher") return;
    const lopId = storedSession.data.lop_hoc_id;
    if (!Number.isFinite(lopId)) return;
    const sb = createBrowserSupabaseClient();
    if (!sb) return;
    void fetchClassmatesForLop(sb, lopId).then(setClassmatesReal);
  }, [storedSession]);

  const normalizedPathSlug = useMemo(() => {
    if (classSlug == null || classSlug === "") return null;
    return normalizePhongHocPathSlug(classSlug);
  }, [classSlug]);

  const sessionSlug = useMemo(() => {
    if (!storedSession) return "";
    return phongHocSlugFromClassName(storedSession.data.class_name);
  }, [storedSession]);

  const hasRoomAccess = useMemo(() => {
    if (normalizedPathSlug == null) return true;
    if (!storedSession) return false;
    if (sessionSlug !== normalizedPathSlug) return false;
    if (storedSession.userType === "Student") {
      const d = storedSession.data.days_remaining;
      if (d === null || d <= 0) return false;
    }
    return true;
  }, [normalizedPathSlug, storedSession, sessionSlug]);

  useEffect(() => {
    if (!mounted) return;
    if (normalizedPathSlug != null) return;
    if (!storedSession) return;
    const s = phongHocSlugFromClassName(storedSession.data.class_name);
    if (!s) return;
    router.replace(`/phong-hoc/${encodeURIComponent(s)}`);
  }, [mounted, normalizedPathSlug, storedSession, router]);

  const isTeacher =
    storedSession != null ? storedSession.userType === "Teacher" : role === "teacher";

  const d: PanelData = useMemo(() => {
    if (storedSession?.userType === "Teacher") {
      const x = storedSession.data;
      const av = x.avatar != null && String(x.avatar).trim() !== "" ? String(x.avatar).trim() : null;
      return {
        full_name: x.full_name,
        email: x.email ?? "",
        lop_hoc_id: x.lop_hoc_id,
        teacher_name: x.full_name,
        class_name: x.class_name,
        staff_avatar_url: av,
        meeting_room: x.meeting_room ?? null,
      };
    }
    if (storedSession?.userType === "Student") {
      const x = storedSession.data;
      return {
        full_name: x.full_name,
        email: x.email ?? "",
        lop_hoc_id: x.lop_hoc_id,
        teacher_name: x.teacher_name,
        class_name: x.class_name,
        staff_avatar_url: null,
        meeting_room: x.meeting_room ?? null,
        days_remaining: x.days_remaining,
        nganh_dao_tao: x.nganh_dao_tao,
        truong_dai_hoc: x.truong_dai_hoc,
        truong_nganh_pairs: x.truong_nganh_pairs,
        ngay_ket_thuc: x.ngay_ket_thuc,
        nam_thi: x.nam_thi,
      };
    }
    if (role === "teacher") {
      const t = SESSIONS.teacher.data;
      return {
        full_name: t.full_name,
        email: t.email,
        lop_hoc_id: t.lop_hoc_id,
        teacher_name: t.teacher_name,
        class_name: t.class_name,
        staff_avatar_url: null,
        meeting_room: t.meeting_room ?? null,
      };
    }
    const s = SESSIONS.student.data;
    return {
      full_name: s.full_name,
      email: s.email,
      lop_hoc_id: s.lop_hoc_id,
      teacher_name: s.teacher_name,
      class_name: "SA01",
      staff_avatar_url: null,
      meeting_room: s.meeting_room ?? null,
      days_remaining: s.days_remaining,
      nganh_dao_tao: s.nganh_dao_tao,
      truong_dai_hoc: s.truong_dai_hoc,
      truong_nganh_pairs: s.truong_nganh_pairs,
      ngay_ket_thuc: s.ngay_ket_thuc,
      nam_thi: s.nam_thi,
    };
  }, [storedSession, role]);

  const studentTnPairs = panelTruongNganhPairs(d);

  const lopHocIdForDb = useMemo(() => {
    if (storedSession != null && Number.isFinite(storedSession.data.lop_hoc_id)) {
      return storedSession.data.lop_hoc_id;
    }
    if (Number.isFinite(d.lop_hoc_id)) return d.lop_hoc_id;
    return NaN;
  }, [storedSession, d.lop_hoc_id]);

  useEffect(() => {
    if (!isTeacher || !browserSb || !Number.isFinite(lopHocIdForDb)) {
      setGalleryLopExercises([]);
      return;
    }
    let cancelled = false;
    void fetchLopCurriculumExercises(browserSb, lopHocIdForDb)
      .then(({ exercises }) => {
        if (!cancelled) setGalleryLopExercises(exercises);
      })
      .catch(() => {
        if (!cancelled) setGalleryLopExercises([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isTeacher, browserSb, lopHocIdForDb]);

  useEffect(() => {
    if (!browserSb || !Number.isFinite(lopHocIdForDb)) {
      setLopMonHocIdForSamples(null);
      setLopTenMonHocLabel(null);
      setLopSamplesMonReady(true);
      return;
    }
    setLopSamplesMonReady(false);
    let cancelled = false;
    void browserSb
      .from("ql_lop_hoc")
      .select("mon_hoc ( id, ten_mon_hoc )")
      .eq("id", lopHocIdForDb)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setLopMonHocIdForSamples(null);
          setLopTenMonHocLabel(null);
          setLopSamplesMonReady(true);
          return;
        }
        const emb = (data as { mon_hoc?: { id?: unknown; ten_mon_hoc?: unknown } | null }).mon_hoc;
        const mid = emb != null && typeof emb === "object" ? Number((emb as { id?: unknown }).id) : NaN;
        const t =
          emb != null && typeof emb === "object"
            ? String((emb as { ten_mon_hoc?: unknown }).ten_mon_hoc ?? "").trim()
            : "";
        setLopMonHocIdForSamples(Number.isFinite(mid) && mid > 0 ? mid : null);
        setLopTenMonHocLabel(t.length > 0 ? t : null);
        setLopSamplesMonReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [browserSb, lopHocIdForDb]);

  useEffect(() => {
    setGlobalSamplesLoaded(false);
    setGlobalSamples([]);
    setGlobalSamplesHasMore(false);
    setMauExerciseSamples(null);
  }, [lopHocIdForDb, lopMonHocIdForSamples]);

  const reloadGalleryFromDb = useCallback(async () => {
    if (!browserSb || !Number.isFinite(lopHocIdForDb)) return;
    setGalleryLoading(true);
    try {
      const rows = await fetchClassroomGalleryForLop(browserSb, lopHocIdForDb);
      const cls = (d.class_name ?? "").trim() || "—";
      const mapped: Artwork[] = rows.map((r) => ({
        hvId: r.hvId,
        ownerStudentId: r.studentId,
        n: r.studentName,
        cls,
        mau: r.mau,
        e: classroomGalleryEmoji(r.studentName),
        score: r.score,
        photo: r.photo,
        exerciseId: r.exerciseId,
        exerciseLabel: r.exerciseLabel,
        exerciseOrder: r.exerciseOrder,
        exerciseTitle: r.exerciseTitle,
        monHocId: r.monHocId,
        tenMonHoc: r.tenMonHoc,
      }));
      setArtworks(mapped);
    } catch {
      setArtworks([]);
    } finally {
      setGalleryLoading(false);
    }
  }, [browserSb, lopHocIdForDb, d.class_name]);

  /** Map 1 row sample (`StudentProfileGalleryRow`) → `Artwork`. Tách ra để dùng chung trang đầu + tải thêm. */
  const mapSampleRowToArtwork = useCallback((r: StudentProfileGalleryRow): Artwork => {
    return {
      hvId: r.hvId,
      ownerStudentId: r.studentId,
      n: r.studentName,
      cls: r.classLabel || "—",
      mau: true,
      e: classroomGalleryEmoji(r.studentName),
      score: r.score,
      photo: r.photo,
      exerciseId: r.exerciseId,
      exerciseLabel: r.exerciseLabel,
      exerciseOrder: r.exerciseOrder,
      exerciseTitle: r.exerciseTitle,
      monHocId: r.monHocId,
      tenMonHoc: r.tenMonHoc,
    };
  }, []);

  /**
   * Tab «Bài mẫu»: chỉ môn của lớp (`ql_lop_hoc.mon_hoc` → `hv_he_thong_bai_tap.mon_hoc`).
   * Nếu lớp không gán môn — giữ fetch toàn hệ thống như trước.
   */
  const reloadGlobalSamples = useCallback(async () => {
    if (!browserSb) return;
    setGlobalSamplesLoading(true);
    try {
      const rows = await fetchAllSampleWorks(browserSb, {
        limit: ALL_SAMPLES_PAGE_SIZE,
        monHocId: lopMonHocIdForSamples,
      });
      setGlobalSamples(rows.map(mapSampleRowToArtwork));
      setGlobalSamplesHasMore(rows.length >= ALL_SAMPLES_PAGE_SIZE);
      setGlobalSamplesLoaded(true);
    } catch {
      setGlobalSamples([]);
      setGlobalSamplesHasMore(false);
      setGlobalSamplesLoaded(true);
    } finally {
      setGlobalSamplesLoading(false);
    }
  }, [browserSb, mapSampleRowToArtwork, lopMonHocIdForSamples]);

  /** Tải trang kế tiếp với cursor `id < lastHvId`. Stop khi server trả < `PAGE_SIZE` row. */
  const loadMoreGlobalSamples = useCallback(async () => {
    if (!browserSb) return;
    if (globalSamplesLoading || globalSamplesLoadingMore || !globalSamplesHasMore) return;
    const lastHvId = globalSamples[globalSamples.length - 1]?.hvId ?? 0;
    if (!Number.isFinite(lastHvId) || lastHvId <= 0) {
      setGlobalSamplesHasMore(false);
      return;
    }
    setGlobalSamplesLoadingMore(true);
    try {
      const rows = await fetchAllSampleWorks(browserSb, {
        beforeId: lastHvId,
        limit: ALL_SAMPLES_PAGE_SIZE,
        monHocId: lopMonHocIdForSamples,
      });
      const mapped = rows.map(mapSampleRowToArtwork);
      setGlobalSamples((prev) => {
        if (mapped.length === 0) return prev;
        const seen = new Set(prev.map((a) => a.hvId));
        const dedup = mapped.filter((a) => a.hvId > 0 && !seen.has(a.hvId));
        return dedup.length ? [...prev, ...dedup] : prev;
      });
      setGlobalSamplesHasMore(rows.length >= ALL_SAMPLES_PAGE_SIZE);
    } catch {
      setGlobalSamplesHasMore(false);
    } finally {
      setGlobalSamplesLoadingMore(false);
    }
  }, [
    browserSb,
    globalSamples,
    globalSamplesHasMore,
    globalSamplesLoading,
    globalSamplesLoadingMore,
    mapSampleRowToArtwork,
    lopMonHocIdForSamples,
  ]);

  /** Tab Bài mẫu + lọc theo bài: một query đủ (score DESC, cap 120) giống gallery `/he-thong-bai-tap/[slug]` tab «Bài mẫu». */
  useEffect(() => {
    if (!isTeacher || !browserSb || gWorkKind !== "mau") {
      setMauExerciseSamples(null);
      setMauExerciseLoading(false);
      return;
    }
    if (gExerciseFilter === "all") {
      setMauExerciseSamples(null);
      setMauExerciseLoading(false);
      return;
    }
    const exId = Number(gExerciseFilter);
    if (!Number.isFinite(exId) || exId <= 0) {
      setMauExerciseSamples(null);
      setMauExerciseLoading(false);
      return;
    }
    let cancelled = false;
    setMauExerciseLoading(true);
    setMauExerciseSamples(null);
    void fetchBaiMauSamplesForExercise(browserSb, exId)
      .then((rows) => {
        if (!cancelled) setMauExerciseSamples(rows.map(mapSampleRowToArtwork));
      })
      .catch(() => {
        if (!cancelled) setMauExerciseSamples([]);
      })
      .finally(() => {
        if (!cancelled) setMauExerciseLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isTeacher, browserSb, gWorkKind, gExerciseFilter, mapSampleRowToArtwork]);

  useEffect(() => {
    if (gWorkKind !== "mau") return;
    if (!lopSamplesMonReady) return;
    if (globalSamplesLoaded || globalSamplesLoading) return;
    void reloadGlobalSamples();
  }, [
    gWorkKind,
    globalSamplesLoaded,
    globalSamplesLoading,
    reloadGlobalSamples,
    lopSamplesMonReady,
  ]);

  /**
   * HV không có quyền duyệt thư viện bài mẫu toàn hệ thống — luôn chốt về tab «Bài học viên».
   * Default `useState("mau")` vẫn giữ để GV (case phổ biến) thấy bài mẫu ngay khi vào.
   */
  useEffect(() => {
    if (!isTeacher && gWorkKind !== "hv") setGWorkKind("hv");
  }, [isTeacher, gWorkKind]);

  /**
   * Tự kích hoạt «Tải thêm bài mẫu» khi sentinel lọt vào viewport (root = `gallery-grid` cuộn dọc).
   * Disconnect khi đổi tab / hết trang để khỏi giữ observer thừa.
   */
  useEffect(() => {
    if (gWorkKind !== "mau") return;
    if (gExerciseFilter !== "all") return;
    if (!globalSamplesHasMore) return;
    const node = loadMoreSentinelRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            void loadMoreGlobalSamples();
            break;
          }
        }
      },
      { root: node.parentElement ?? null, rootMargin: "200px 0px", threshold: 0 },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [gWorkKind, gExerciseFilter, globalSamplesHasMore, loadMoreGlobalSamples, globalSamples.length]);

  /** Cập nhật state Google Meet + session localStorage khi có row `ql_lop_hoc`. */
  const applyClassMeetRow = useCallback((row: LopHocMeetRow) => {
    setGoogleMeetUrl(row.url_google_meet);
    setGoogleMeetSetAt(row.url_google_meet_set_at);
    setLopDevice(row.device);
    setGmeetRowReady(true);
    setStoredSession((prev) => {
      if (!prev) return prev;
      const v = row.meeting_room;
      const cur =
        prev.data.meeting_room != null && String(prev.data.meeting_room).trim() !== ""
          ? String(prev.data.meeting_room).trim()
          : null;
      if (cur === v) return prev;
      const next: ClassroomSessionRecord =
        prev.userType === "Teacher"
          ? { userType: "Teacher", data: { ...prev.data, meeting_room: v } }
          : { userType: "Student", data: { ...prev.data, meeting_room: v } };
      saveClassroomSession(next);
      return next;
    });
  }, []);

  /**
   * Google Meet + row lớp: đọc **trực tiếp** `ql_lop_hoc` qua Supabase browser (anon + RLS) — không qua Vercel.
   * Chỉ gọi `/api/phong-hoc/class-meet-row` khi không đọc được row (kẹt RLS / thiếu client).
   * Realtime `UPDATE` áp `payload.new` qua `lopMeetRowFromRealtimeNewRow` — không poll 5s nữa.
   */
  const refreshClassMeetRow = useCallback(async () => {
    if (!Number.isFinite(lopHocIdForDb)) return;
    const id = lopHocIdForDb;

    if (browserSb) {
      const direct = await fetchLopHocMeetRow(browserSb, id);
      if (direct) {
        applyClassMeetRow(direct);
        return;
      }
    }

    try {
      const res = await fetch(
        `/api/phong-hoc/class-meet-row?lopHocId=${encodeURIComponent(String(id))}`,
        { credentials: "include" }
      );
      if (res.ok) {
        const j = (await res.json()) as LopHocMeetRow;
        applyClassMeetRow(j);
        return;
      }
    } catch {
      /* API lỗi mạng — xử lý dưới */
    }

    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setGmeetRowReady(true);
      return;
    }
    const row = await fetchLopHocMeetRow(supabase, id);
    if (!row) {
      setGoogleMeetUrl(null);
      setGoogleMeetSetAt(null);
      setLopDevice(null);
      setGmeetRowReady(true);
      return;
    }
    applyClassMeetRow(row);
  }, [lopHocIdForDb, browserSb, applyClassMeetRow]);

  /**
   * Điểm danh «đã vào phòng» + làm mới `last_seen_at` (heartbeat).
   * Gọi khi HV mở Phòng học và định kỳ khi tab đang hiển thị.
   */
  const recordDiemDanhWhenStudentInRoom = useCallback(async () => {
    if (storedSession?.userType !== "Student") return;
    if (!hasRoomAccess) return;
    if (!Number.isFinite(lopHocIdForDb)) return;
    try {
      const res = await fetch("/api/phong-hoc/diem-danh/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ lopHocId: lopHocIdForDb }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        console.warn("[phong-hoc] diem-danh/record failed", res.status, t);
      }
    } catch (e) {
      console.warn("[phong-hoc] diem-danh/record fetch error", e);
    }
  }, [storedSession?.userType, hasRoomAccess, lopHocIdForDb]);

  useEffect(() => {
    if (!mounted) return;
    void recordDiemDanhWhenStudentInRoom();
  }, [mounted, recordDiemDanhWhenStudentInRoom]);

  /** HV: heartbeat — hết timer → sau ~`HV_DIEM_DANH_PRESENCE_STALE_MS` GV thấy xám (tab nền có thể chậm hơn). */
  useEffect(() => {
    if (!mounted || storedSession?.userType !== "Student" || !hasRoomAccess || !Number.isFinite(lopHocIdForDb)) {
      return;
    }
    const pulse = () => {
      void recordDiemDanhWhenStudentInRoom();
    };
    const id = window.setInterval(pulse, HV_DIEM_DANH_HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [mounted, storedSession?.userType, hasRoomAccess, lopHocIdForDb, recordDiemDanhWhenStudentInRoom]);

  /** `hr_nhan_su.id` của GV — chỉ có khi session là Teacher. Dùng để gọi API ghi
   * tiến độ học viên (bypass RLS + verify chủ nhiệm phía server). */
  const teacherHrIdForDb = useMemo(() => {
    if (storedSession?.userType === "Teacher" && Number.isFinite(storedSession.data.id)) {
      return storedSession.data.id;
    }
    return NaN;
  }, [storedSession]);

  const openBaiMauModal = useCallback(() => {
    setBaiMauErr(null);
    setBaiMauPhotoUrl("");
    setBaiMauExerciseId("");
    setBaiMauPreviewUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return null;
    });
    setGWorkKind("mau");
    setBaiMauModalOpen(true);
  }, []);

  const closeBaiMauModal = useCallback(() => {
    setBaiMauPreviewUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return null;
    });
    setBaiMauModalOpen(false);
    setBaiMauErr(null);
    setBaiMauUploading(false);
    setBaiMauSaving(false);
  }, []);

  const uploadBaiMauImageFile = useCallback(async (f: File) => {
    if (!f.type.startsWith("image/")) {
      setBaiMauErr("Chỉ dùng được file ảnh.");
      return;
    }
    setBaiMauErr(null);
    setBaiMauUploading(true);
    setBaiMauPreviewUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
    try {
      const res = await postUploadChatImage(f);
      if (!res.ok) {
        setBaiMauErr(res.error);
        setBaiMauPhotoUrl("");
        return;
      }
      setBaiMauPhotoUrl(res.url);
    } finally {
      setBaiMauUploading(false);
    }
  }, []);

  const onBaiMauPickFile = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      e.target.value = "";
      if (!f) return;
      void uploadBaiMauImageFile(f);
    },
    [uploadBaiMauImageFile]
  );

  /** Ctrl+V dán ảnh từ clipboard khi popup mở (trừ khi đang gõ link trong ô input/textarea). */
  useEffect(() => {
    if (!baiMauModalOpen) return;
    const onPaste = (e: ClipboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName ?? "";
      if (tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT") return;
      const items = e.clipboardData?.items;
      if (!items?.length) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) {
            e.preventDefault();
            void uploadBaiMauImageFile(f);
          }
          return;
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [baiMauModalOpen, uploadBaiMauImageFile]);

  const submitBaiMau = useCallback(async () => {
    if (!Number.isFinite(teacherHrIdForDb)) {
      setBaiMauErr("Không xác định tài khoản giáo viên.");
      return;
    }
    const photo = baiMauPhotoUrl.trim();
    if (!/^https:\/\//i.test(photo)) {
      setBaiMauErr("Thêm ảnh: nút chọn file, Ctrl+V trong ô xem trước, hoặc dán link ảnh.");
      return;
    }
    const ex = Number(baiMauExerciseId);
    if (!Number.isFinite(ex) || ex <= 0) {
      setBaiMauErr("Chọn bài tập.");
      return;
    }
    setBaiMauSaving(true);
    setBaiMauErr(null);
    try {
      const res = await fetch("/api/phong-hoc/teacher-add-bai-mau", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lopHocId: lopHocIdForDb,
          teacherHrId: teacherHrIdForDb,
          thuocBaiTap: ex,
          photo,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setBaiMauErr(typeof data.error === "string" ? data.error : "Không lưu được.");
        return;
      }
      setBaiMauPreviewUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return null;
      });
      setBaiMauModalOpen(false);
      setBaiMauPhotoUrl("");
      setBaiMauExerciseId("");
      await reloadGalleryFromDb();
      setGlobalSamplesLoaded(false);
      void reloadGlobalSamples();
    } catch (err) {
      setBaiMauErr(err instanceof Error ? err.message : "Lỗi mạng.");
    } finally {
      setBaiMauSaving(false);
    }
  }, [
    teacherHrIdForDb,
    baiMauPhotoUrl,
    baiMauExerciseId,
    lopHocIdForDb,
    reloadGalleryFromDb,
    reloadGlobalSamples,
  ]);

  const baiMauCanSave = useMemo(() => {
    if (!Number.isFinite(teacherHrIdForDb) || teacherHrIdForDb <= 0) return false;
    if (baiMauSaving || baiMauUploading || baiMauExercisesLoading) return false;
    const photo = baiMauPhotoUrl.trim();
    if (!/^https:\/\//i.test(photo)) return false;
    const ex = Number(baiMauExerciseId);
    if (!Number.isFinite(ex) || ex <= 0) return false;
    if (baiMauExercises.length === 0) return false;
    return true;
  }, [
    teacherHrIdForDb,
    baiMauSaving,
    baiMauUploading,
    baiMauExercisesLoading,
    baiMauPhotoUrl,
    baiMauExerciseId,
    baiMauExercises.length,
  ]);

  useEffect(() => {
    if (storedSession?.userType !== "Student") {
      setHvStudentPkResolved(null);
      return;
    }
    const direct = storedSession.data.id;
    if (Number.isFinite(direct) && direct > 0) {
      setHvStudentPkResolved(null);
      return;
    }
    const qlhv = storedSession.data.qlhv_id;
    if (!browserSb || !Number.isFinite(qlhv) || qlhv <= 0) {
      setHvStudentPkResolved(null);
      return;
    }
    let cancelled = false;
    void browserSb
      .from("ql_quan_ly_hoc_vien")
      .select("hoc_vien_id")
      .eq("id", qlhv)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setHvStudentPkResolved(null);
          return;
        }
        const pk = Number((data as { hoc_vien_id?: unknown }).hoc_vien_id);
        if (Number.isFinite(pk) && pk > 0) setHvStudentPkResolved(pk);
        else setHvStudentPkResolved(null);
      });
    return () => {
      cancelled = true;
    };
  }, [storedSession, browserSb]);

  useEffect(() => {
    if (!mounted) return;
    if (!storedSession) {
      setArtworks(ARTWORKS_SEED);
      setGalleryLoading(false);
      return;
    }
    if (!browserSb || !Number.isFinite(lopHocIdForDb)) return;
    void reloadGalleryFromDb();
  }, [mounted, storedSession, browserSb, lopHocIdForDb, reloadGalleryFromDb]);

  useEffect(() => {
    if (!baiMauModalOpen || !browserSb || !Number.isFinite(lopHocIdForDb)) return;
    let cancelled = false;
    setBaiMauExercisesLoading(true);
    void fetchLopCurriculumExercises(browserSb, lopHocIdForDb)
      .then(({ exercises }) => {
        if (cancelled) return;
        setBaiMauExercises(exercises);
        setBaiMauExercisesLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setBaiMauExercises([]);
          setBaiMauExercisesLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [baiMauModalOpen, browserSb, lopHocIdForDb]);

  useEffect(() => {
    if (!isTeacher) return;
    setGFilter("class");
  }, [isTeacher]);

  useEffect(() => {
    if (!mounted) return;
    if (!isTeacher) {
      setTeacherChatSaved({});
      return;
    }
    if (!Number.isFinite(lopHocIdForDb)) {
      setTeacherChatSaved({});
      return;
    }
    const ids = readTeacherSavedChatMessageIds(lopHocIdForDb);
    const rec: Record<number, boolean> = {};
    for (const id of ids) rec[id] = true;
    setTeacherChatSaved(rec);
  }, [mounted, isTeacher, lopHocIdForDb]);

  const openChatProgressFromChat = useCallback(
    async (entry: ChatStudentMapEntry) => {
      if (!isTeacher || !browserSb || !Number.isFinite(lopHocIdForDb)) return;
      setChatProgressPicker({ phase: "loading" });
      try {
        const curEx =
          entry.exId != null && Number.isFinite(entry.exId) ? chatExMap[entry.exId] : undefined;
        const filterSubjectFallback = curEx?.mon ?? "";
        const [exRows, tenMon] = await Promise.all([
          fetchExercisesForManage(browserSb),
          fetchTenMonHocForLop(browserSb, lopHocIdForDb),
        ]);
        const { bySubject } = buildExerciseModel(exRows);
        const allSubjects = Object.keys(bySubject).sort();
        const student: StudentManageRow = {
          enrollmentId: entry.qlhvId,
          studentId: entry.hocVienId,
          name: entry.name,
          email: "",
          namThi: "—",
          className: d.class_name,
          status: "Đang học",
          tienDoId: entry.exId != null && Number.isFinite(entry.exId) ? entry.exId : null,
          currentEx: null,
          latest: {},
          truongNganhPairs: null,
          conNgayHoc: true,
        };
        setChatProgressPicker({
          phase: "ready",
          data: {
            student,
            exBySubject: bySubject,
            allSubjects,
            lopTenMonHoc: tenMon,
            filterSubjectFallback,
          },
        });
      } catch (e: unknown) {
        setChatProgressPicker({
          phase: "error",
          message: e instanceof Error ? e.message : "Không tải được danh sách bài.",
        });
      }
    },
    [isTeacher, browserSb, lopHocIdForDb, chatExMap, d.class_name]
  );

  const handleTeacherSaveChatPhoto = useCallback(
    async (m: HvChatboxRow, enrollmentQlhvId: number) => {
      if (!isTeacher || !Number.isFinite(lopHocIdForDb)) return;
      if (storedSession?.userType !== "Teacher" || !Number.isFinite(storedSession.data.id)) return;
      const photo = (m.photos?.[0] ?? m.photo)?.trim();
      if (!photo) return;
      const teacherHrId = storedSession.data.id;
      setTeacherSaveChatBusy((prev) => ({ ...prev, [m.id]: true }));
      try {
        const res = await fetch("/api/phong-hoc/save-chat-student-work", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lopHocId: lopHocIdForDb,
            enrollmentQlhvId,
            photo,
            teacherHrId,
          }),
        });
        const j = (await res.json()) as {
          error?: string;
          tenBaiTapLabel?: string;
          alreadySaved?: boolean;
        };
        if (!res.ok) throw new Error(j.error || "Lưu thất bại");
        const label = j.tenBaiTapLabel?.trim();
        persistTeacherSavedChatMessageId(lopHocIdForDb, m.id);
        setTeacherChatSaved((prev) => ({ ...prev, [m.id]: true }));
        const line = j.alreadySaved
          ? label
            ? `Ảnh đã được lưu trước đó (chờ xác nhận) — ${label}`
            : "Ảnh đã được lưu trước đó (chờ xác nhận)."
          : label
            ? `Đã lưu bài học viên (chờ xác nhận) — ${label}`
            : "Đã lưu bài học viên (chờ xác nhận).";
        setTeacherSaveChatNotice(line);
        if (teacherSaveToastTimerRef.current) clearTimeout(teacherSaveToastTimerRef.current);
        teacherSaveToastTimerRef.current = window.setTimeout(() => {
          teacherSaveToastTimerRef.current = null;
          setTeacherSaveChatNotice(null);
        }, 4500);
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : "Lỗi lưu");
      } finally {
        setTeacherSaveChatBusy((prev) => {
          const next = { ...prev };
          delete next[m.id];
          return next;
        });
      }
    },
    [isTeacher, lopHocIdForDb, storedSession]
  );

  useEffect(() => {
    if (!Number.isFinite(lopHocIdForDb)) {
      setGoogleMeetUrl(null);
      setGoogleMeetSetAt(null);
      setLopDevice(null);
      setGmeetRowReady(false);
      return;
    }
    void refreshClassMeetRow();
  }, [lopHocIdForDb, refreshClassMeetRow]);

  /** HV: khi quay lại tab — tải lại link Meet ngay. */
  useEffect(() => {
    if (storedSession?.userType !== "Student") return;
    if (!Number.isFinite(lopHocIdForDb)) return;
    const onBecameVisible = () => {
      if (document.visibilityState === "visible") void refreshClassMeetRow();
    };
    document.addEventListener("visibilitychange", onBecameVisible);
    window.addEventListener("focus", onBecameVisible);
    return () => {
      document.removeEventListener("visibilitychange", onBecameVisible);
      window.removeEventListener("focus", onBecameVisible);
    };
  }, [storedSession?.userType, lopHocIdForDb, refreshClassMeetRow]);

  /**
   * GV lưu Meet → cập nhật UI từ payload Realtime (không gọi thêm HTTP `/class-meet-row`).
   * Supabase: Database → Publications → bật `ql_lop_hoc` cho `supabase_realtime` (nếu chưa).
   */
  useEffect(() => {
    if (!browserSb || !Number.isFinite(lopHocIdForDb)) return;
    if (lopMeetRealtimeChannelRef.current) {
      browserSb.removeChannel(lopMeetRealtimeChannelRef.current);
      lopMeetRealtimeChannelRef.current = null;
    }
    const channel = browserSb
      .channel(`lop-hoc-meet-${lopHocIdForDb}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "ql_lop_hoc",
          filter: `id=eq.${lopHocIdForDb}`,
        },
        (payload) => {
          const n = payload.new as Record<string, unknown> | null;
          if (!n || typeof n !== "object") return;
          applyClassMeetRow(lopMeetRowFromRealtimeNewRow(n));
        }
      )
      .subscribe();
    lopMeetRealtimeChannelRef.current = channel;
    return () => {
      if (lopMeetRealtimeChannelRef.current) {
        browserSb.removeChannel(lopMeetRealtimeChannelRef.current);
        lopMeetRealtimeChannelRef.current = null;
      }
    };
  }, [browserSb, lopHocIdForDb, applyClassMeetRow]);

  const saveGoogleMeetUrl = useCallback(async () => {
    const url = gmeetInput.trim();
    if (!url || !Number.isFinite(lopHocIdForDb)) return;
    setGmeetSaving(true);
    try {
      let ok = false;
      let setAtIso: string | null = new Date().toISOString();

      if (storedSession?.userType === "Teacher" && Number.isFinite(teacherHrIdForDb)) {
        const res = await fetch("/api/phong-hoc/save-google-meet-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            lopHocId: lopHocIdForDb,
            teacherHrId: teacherHrIdForDb,
            url,
          }),
        });
        const j = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
          url_google_meet_set_at?: string | null;
        };
        ok = res.ok && j.ok === true;
        if (j.url_google_meet_set_at) setAtIso = j.url_google_meet_set_at;
        if (!ok) {
          window.alert(j.error ?? "Không lưu được link Meet. Kiểm tra quyền chủ nhiệm lớp.");
        }
      } else {
        const sb = createBrowserSupabaseClient();
        if (!sb) {
          window.alert("Chưa cấu hình kết nối Supabase.");
          setGmeetSaving(false);
          return;
        }
        ok = await patchLopHocGoogleMeetUrl(sb, lopHocIdForDb, url);
        if (!ok) {
          window.alert(
            "Không ghi được vào CSDL (thường do quyền). Đăng nhập lại Phòng học bằng tài khoản giáo viên hoặc liên hệ quản trị."
          );
        }
      }

      setGmeetSaving(false);
      if (!ok) return;
      setGoogleMeetUrl(url);
      setGoogleMeetSetAt(setAtIso);
      setGmeetFormOpen(false);
      setGmeetInput("");
      setGmeetJustSaved(true);
      if (gmeetSavedTimerRef.current) clearTimeout(gmeetSavedTimerRef.current);
      gmeetSavedTimerRef.current = setTimeout(() => {
        setGmeetJustSaved(false);
        gmeetSavedTimerRef.current = null;
      }, 3000);
    } catch {
      setGmeetSaving(false);
      window.alert("Lỗi mạng khi lưu link Meet.");
    }
  }, [gmeetInput, lopHocIdForDb, storedSession?.userType, teacherHrIdForDb]);

  const clearGoogleMeetUrl = useCallback(async () => {
    if (!googleMeetUrl?.trim() || !Number.isFinite(lopHocIdForDb)) return;
    if (
      !window.confirm(
        "Gỡ link Google Meet của lớp này? Sau đó mọi người sẽ học trong phòng học Sine Art (video trên trang)."
      )
    ) {
      return;
    }
    setGmeetSaving(true);
    try {
      let ok = false;
      if (storedSession?.userType === "Teacher" && Number.isFinite(teacherHrIdForDb)) {
        const res = await fetch("/api/phong-hoc/save-google-meet-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            lopHocId: lopHocIdForDb,
            teacherHrId: teacherHrIdForDb,
            url: "",
            clear: true,
          }),
        });
        const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        ok = res.ok && j.ok === true;
        if (!ok) {
          window.alert(
            j.error ??
              "Không chuyển được sang phòng học Sine Art. Kiểm tra quyền chủ nhiệm lớp."
          );
        }
      } else {
        const sb = createBrowserSupabaseClient();
        if (!sb) {
          window.alert("Chưa cấu hình kết nối Supabase.");
          setGmeetSaving(false);
          return;
        }
        ok = await patchLopHocGoogleMeetUrl(sb, lopHocIdForDb, null);
        if (!ok) {
          window.alert(
            "Không ghi được vào CSDL (thường do quyền). Đăng nhập lại Phòng học bằng tài khoản giáo viên hoặc liên hệ quản trị."
          );
        }
      }

      setGmeetSaving(false);
      if (!ok) return;
      setGoogleMeetUrl(null);
      setGoogleMeetSetAt(null);
      setGmeetFormOpen(false);
      setGmeetInput("");
      setGmeetJustSaved(false);
      if (gmeetSavedTimerRef.current) {
        clearTimeout(gmeetSavedTimerRef.current);
        gmeetSavedTimerRef.current = null;
      }
    } catch {
      setGmeetSaving(false);
      window.alert("Lỗi mạng khi chuyển sang phòng học Sine Art.");
    }
  }, [
    googleMeetUrl,
    lopHocIdForDb,
    storedSession?.userType,
    teacherHrIdForDb,
  ]);

  useEffect(() => {
    return () => {
      if (gmeetSavedTimerRef.current) clearTimeout(gmeetSavedTimerRef.current);
    };
  }, []);

  /** Danh sách học viên tab Lớp (GV): session → DB; xem thử / chưa đăng nhập → mock. */
  const teacherClassmates = useMemo((): ClassmateListRow[] => {
    if (storedSession?.userType !== "Teacher") return STUDENTS_MOCK;
    if (classmatesReal === undefined) return [];
    return classmatesReal;
  }, [storedSession, classmatesReal]);

  /**
   * Sidebar học viên: chỉ Google Meet (`url_google_meet`).
   * Link chỉ hiện trong **cùng ngày lịch VN** sau khi GV lưu (`url_google_meet_set_at`).
   */
  const studentSidebarMeetUrl = useMemo((): string | null => {
    if (storedSession?.userType !== "Student") return null;
    const raw = studentVisibleGoogleMeetUrl(googleMeetUrl, googleMeetSetAt);
    if (!raw?.trim()) return null;
    return normalizeMeetingRoomUrl(raw.trim()) ?? raw.trim();
  }, [googleMeetUrl, googleMeetSetAt, storedSession?.userType]);

  /**
   * Khung chính chỉ CTA Google Meet (`url_google_meet`): HV (theo ngày VN) / GV (URL đã lưu).
   */
  const canvasMeetJoinUrl = useMemo((): string | null => {
    if (storedSession?.userType === "Student") return studentSidebarMeetUrl;
    if (storedSession?.userType === "Teacher") {
      const u = googleMeetUrl?.trim();
      if (!u) return null;
      return normalizeMeetingRoomUrl(u) ?? u;
    }
    return null;
  }, [storedSession?.userType, studentSidebarMeetUrl, googleMeetUrl]);

  /** Tiêu đề topbar — tên lớp (`class_name`), fallback tên đầy đủ / slug URL. */
  const topbarTitle = useMemo(() => {
    const short = (d.class_name ?? "").trim();
    if (short) return short;
    if (storedSession?.userType === "Teacher" || storedSession?.userType === "Student") {
      const full = String(storedSession.data.class_full_name ?? "").trim();
      if (full) return full;
    }
    if (classSlug != null && String(classSlug).trim() !== "") {
      try {
        return decodeURIComponent(classSlug).replace(/_/g, " ");
      } catch {
        return classSlug;
      }
    }
    return "Phòng học";
  }, [d.class_name, storedSession, classSlug]);

  const liveChatEnabled =
    mounted && storedSession !== null && Number.isFinite(lopHocIdForDb);

  const teacherPresenceSidebar =
    isTeacher &&
    storedSession?.userType === "Teacher" &&
    classmatesReal !== undefined;

  /** GV: học viên đang online (theo heartbeat) lên trên, sau đó sắp tên. */
  const teacherClassmatesOnlineFirst = useMemo((): ClassmateListRow[] => {
    if (!teacherPresenceSidebar) return teacherClassmates;
    const now = Date.now();
    const out = [...teacherClassmates];
    out.sort((a, b) => {
      const aLive = hvPresenceIsLive(dbLastSeenMsByHvId.get(a.hvId), now);
      const bLive = hvPresenceIsLive(dbLastSeenMsByHvId.get(b.hvId), now);
      if (aLive !== bLive) return aLive ? -1 : 1;
      return a.n.localeCompare(b.n, "vi", { sensitivity: "base" });
    });
    return out;
  }, [
    teacherClassmates,
    teacherPresenceSidebar,
    dbLastSeenMsByHvId,
    presenceUiTick,
  ]);

  const photoVisitWhileOnline = useMemo(() => {
    const set = new Set<number>();
    if (!teacherPresenceSidebar || !liveChatEnabled) return set;
    const now = Date.now();
    const enToHv = new Map(classmatesReal!.map((x) => [x.enrollmentId, x.hvId]));
    for (const m of hvChatRows) {
      if (m.usertype !== "Student" || !m.photo?.trim()) continue;
      const en = parseQlhvKey(m.name);
      if (en == null) continue;
      const hvId = enToHv.get(en);
      const last = hvId != null ? dbLastSeenMsByHvId.get(hvId) : undefined;
      if (hvId != null && hvPresenceIsLive(last, now)) set.add(hvId);
    }
    return set;
  }, [
    teacherPresenceSidebar,
    liveChatEnabled,
    classmatesReal,
    hvChatRows,
    dbLastSeenMsByHvId,
    presenceUiTick,
  ]);

  const sidebarAttendanceStyle = useCallback(
    (s: ClassmateListRow): { dot: "dg" | "dy" | "dr"; nameCls: string } => {
      if (!teacherPresenceSidebar) {
        const dot: "dg" | "dy" | "dr" =
          s.st === true ? "dg" : s.st === "late" ? "dy" : "dr";
        const nameCls =
          dot === "dg" ? "phc-o-ok" : dot === "dy" ? "phc-o-warn" : "phc-o-muted";
        return { dot, nameCls };
      }
      const here = hvPresenceIsLive(dbLastSeenMsByHvId.get(s.hvId), Date.now());
      if (!here) {
        return { dot: "dr", nameCls: "phc-o-muted" };
      }
      if (photoVisitWhileOnline.has(s.hvId)) {
        return { dot: "dg", nameCls: "phc-o-ok" };
      }
      return { dot: "dy", nameCls: "phc-o-warn" };
    },
    [
      teacherPresenceSidebar,
      dbLastSeenMsByHvId,
      photoVisitWhileOnline,
      presenceUiTick,
    ]
  );

  useEffect(() => {
    if (!teacherPresenceSidebar) return;
    const id = window.setInterval(() => setPresenceUiTick((n) => n + 1), 20_000);
    return () => clearInterval(id);
  }, [teacherPresenceSidebar]);

  /** GV: poll `last_seen_at` — online = heartbeat còn mới (HV còn mở Phòng học / tab hiển thị). */
  useEffect(() => {
    if (!mounted || !teacherPresenceSidebar || !Number.isFinite(lopHocIdForDb)) {
      setDbLastSeenMsByHvId(new Map());
      return;
    }
    let cancelled = false;
    const tick = async () => {
      const day = vnCalendarDateString();
      try {
        const u = new URL("/api/phong-hoc/diem-danh", window.location.origin);
        u.searchParams.set("lopHocId", String(lopHocIdForDb));
        u.searchParams.set("ngayFrom", day);
        u.searchParams.set("ngayTo", day);
        const res = await fetch(u.toString(), { credentials: "include" });
        if (cancelled || !res.ok) return;
        const j = (await res.json()) as {
          rows?: {
            hoc_vien_id?: number;
            da_vao_phong?: boolean;
            last_seen_at?: string | null;
            first_join_at?: string | null;
          }[];
        };
        const next = new Map<number, number>();
        for (const r of j.rows ?? []) {
          if (
            !r.da_vao_phong ||
            typeof r.hoc_vien_id !== "number" ||
            !Number.isFinite(r.hoc_vien_id) ||
            r.hoc_vien_id <= 0
          ) {
            continue;
          }
          const ms =
            parseIsoToUtcMs(r.last_seen_at) ?? parseIsoToUtcMs(r.first_join_at);
          if (ms != null) next.set(r.hoc_vien_id, ms);
        }
        if (!cancelled) setDbLastSeenMsByHvId(next);
      } catch {
        /* ignore */
      }
    };
    void tick();
    const id = window.setInterval(tick, GV_DIEM_DANH_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [mounted, teacherPresenceSidebar, lopHocIdForDb]);

  /** GV giờ cũng có tab «Bài giảng» (tab id `third`) — không còn redirect về `lop`. */

  useEffect(() => {
    if (storedSession?.userType === "Student" && Number.isFinite(storedSession.data.qlhv_id)) {
      myQlhvIdRef.current = storedSession.data.qlhv_id;
    } else {
      myQlhvIdRef.current = null;
    }
  }, [storedSession]);

  useEffect(() => {
    if (!browserSb || !Number.isFinite(lopHocIdForDb)) {
      setChatClassTeacherAvatarUrl(null);
      return;
    }
    if (storedSession?.userType === "Teacher") {
      const av = d.staff_avatar_url?.trim();
      setChatClassTeacherAvatarUrl(av && av.length > 0 ? av : null);
      return;
    }
    if (storedSession?.userType !== "Student") {
      setChatClassTeacherAvatarUrl(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data: lop, error: e1 } = await browserSb
        .from("ql_lop_hoc")
        .select("teacher")
        .eq("id", lopHocIdForDb)
        .maybeSingle();
      if (cancelled || e1) {
        if (!cancelled) setChatClassTeacherAvatarUrl(null);
        return;
      }
      const tid = Number((lop as { teacher?: unknown } | null)?.teacher);
      if (!Number.isFinite(tid)) {
        if (!cancelled) setChatClassTeacherAvatarUrl(null);
        return;
      }
      const { data: ns } = await browserSb
        .from("hr_nhan_su")
        .select("avatar")
        .eq("id", tid)
        .maybeSingle();
      if (cancelled) return;
      const raw = ns && typeof (ns as { avatar?: unknown }).avatar === "string" ? (ns as { avatar: string }).avatar : "";
      const u = raw.trim();
      setChatClassTeacherAvatarUrl(u.length > 0 ? u : null);
    })();
    return () => {
      cancelled = true;
    };
  }, [browserSb, lopHocIdForDb, storedSession, d.staff_avatar_url]);

  useEffect(() => {
    if (tab !== "third" || !liveChatEnabled || !browserSb || !Number.isFinite(lopHocIdForDb)) {
      return;
    }

    let cancelled = false;
    setStuCurrLoading(true);
    setStuCurrErr(null);

    void (async () => {
      try {
        const { exercises, subjectName, monHocId } = await fetchLopCurriculumExercises(browserSb, lopHocIdForDb);
        if (cancelled) return;

        let tienDo: number | null = null;
        if (storedSession?.userType === "Student") {
          const sessionTd = storedSession.data.tien_do_hoc;
          if (Number.isFinite(storedSession.data.qlhv_id)) {
            const { data: enRow, error: enErr } = await browserSb
              .from("ql_quan_ly_hoc_vien")
              .select("tien_do_hoc")
              .eq("id", storedSession.data.qlhv_id)
              .maybeSingle();
            if (!cancelled && !enErr && enRow) {
              const raw = (enRow as { tien_do_hoc?: unknown }).tien_do_hoc;
              tienDo =
                raw != null && raw !== "" && Number.isFinite(Number(raw)) ? Number(raw) : null;
            } else if (!cancelled) {
              tienDo = sessionTd != null && Number.isFinite(sessionTd) ? sessionTd : null;
            }
          } else {
            tienDo = sessionTd != null && Number.isFinite(sessionTd) ? sessionTd : null;
          }
        }

        if (cancelled) return;
        setStuCurrExercises(exercises);
        setStuCurrSubject(subjectName);
        setStuCurrMonId(monHocId ?? null);
        setStuCurrTienDo(tienDo);
      } catch (e: unknown) {
        if (!cancelled) {
          setStuCurrErr(e instanceof Error ? e.message : "Không tải được danh sách bài.");
          setStuCurrExercises([]);
          setStuCurrSubject(null);
          setStuCurrMonId(null);
          setStuCurrTienDo(null);
        }
      } finally {
        if (!cancelled) setStuCurrLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tab, isTeacher, liveChatEnabled, browserSb, lopHocIdForDb, storedSession]);

  useEffect(() => {
    setTaskDetailOpenId(null);
  }, [stuCurrExercises]);

  useEffect(() => {
    if (!Number.isFinite(lopHocIdForDb) || !storedSession) {
      setHvChatRows([]);
      setHvChatErr(null);
      setChatStudentByQlhv({});
      hvKnownIdsRef.current = new Set();
      hvLatestCreatedAtRef.current = "";
      if (browserSb && hvChatRealtimeChannelRef.current) {
        browserSb.removeChannel(hvChatRealtimeChannelRef.current);
        hvChatRealtimeChannelRef.current = null;
      }
      return;
    }

    let cancelled = false;

    if (browserSb) {
      void fetchChatStudentMapByQlhv(browserSb, lopHocIdForDb).then((map) => {
        if (!cancelled) setChatStudentByQlhv(map);
      });

      void fetchChatExerciseIndex(browserSb)
        .then(({ exMap, totalBySubject }) => {
          if (!cancelled) {
            setChatExMap(exMap);
            setChatTotalByMon(totalBySubject);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setChatExMap({});
            setChatTotalByMon({});
          }
        });
    } else {
      setChatStudentByQlhv({});
      setChatExMap({});
      setChatTotalByMon({});
    }

    setHvChatVisibleCount(HV_CHAT_INITIAL);
    hvKnownIdsRef.current = new Set();
    hvLatestCreatedAtRef.current = "";

    try {
      const raw = localStorage.getItem(chatCacheKey(lopHocIdForDb));
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = parsed[0] as { id?: unknown; created_at?: unknown };
          for (const row of parsed) {
            const id = Number((row as { id?: unknown }).id);
            if (Number.isFinite(id)) hvKnownIdsRef.current.add(id);
          }
          const t0 = typeof first.created_at === "string" ? first.created_at : "";
          if (t0) hvLatestCreatedAtRef.current = t0;
          setHvChatRows(
            parsed.map((row) => mapChatboxRow(row as Record<string, unknown>))
          );
        }
      }
    } catch {
      /* ignore */
    }

    const applyRowsFromServer = (rows: HvChatboxRow[]) => {
      if (cancelled) return;
      setHvChatErr(null);
      hvKnownIdsRef.current = new Set(rows.map((r) => r.id));
      if (rows[0]?.created_at) hvLatestCreatedAtRef.current = rows[0].created_at;
      setHvChatRows(rows);
      try {
        localStorage.setItem(chatCacheKey(lopHocIdForDb), JSON.stringify(rows.slice(0, 50)));
      } catch {
        /* ignore */
      }
    };

    const failLoad = (e: unknown) => {
      if (!cancelled) {
        setHvChatErr(e instanceof Error ? e.message : "Không tải được chat.");
        setHvChatRows([]);
      }
    };

    /** Không có Supabase browser: một lần qua API (như cũ), không Realtime. */
    if (!browserSb) {
      void apiFetchHvChatboxMessages(lopHocIdForDb).then(applyRowsFromServer).catch(failLoad);
      return () => {
        cancelled = true;
      };
    }

    const gen = ++hvChatEffectGenerationRef.current;

    void (async () => {
      if (cancelled) return;
      if (hvChatRealtimeChannelRef.current) {
        browserSb.removeChannel(hvChatRealtimeChannelRef.current);
        hvChatRealtimeChannelRef.current = null;
      }

      try {
        const { rows, lopColumn } = await fetchHvChatboxMessagesWithLopColumn(browserSb, lopHocIdForDb);
        if (cancelled || gen !== hvChatEffectGenerationRef.current) return;
        applyRowsFromServer(rows);

        const channel = browserSb
          .channel(`chatbox-${lopHocIdForDb}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "hv_chatbox",
              filter: `${lopColumn}=eq.${lopHocIdForDb}`,
            },
            (payload) => {
              const row = mapChatboxRow((payload.new ?? {}) as Record<string, unknown>);
              if (!Number.isFinite(row.id)) return;
              setHvChatRows((prev) => {
                if (hvKnownIdsRef.current.has(row.id)) return prev;
                hvKnownIdsRef.current.add(row.id);
                if (row.created_at > hvLatestCreatedAtRef.current) {
                  hvLatestCreatedAtRef.current = row.created_at;
                }
                const merged = [row, ...prev.filter((p) => p.id !== row.id)].slice(0, 200);
                try {
                  localStorage.setItem(chatCacheKey(lopHocIdForDb), JSON.stringify(merged.slice(0, 50)));
                } catch {
                  /* ignore */
                }
                return merged;
              });
            }
          )
          .subscribe();

        if (cancelled || gen !== hvChatEffectGenerationRef.current) {
          browserSb.removeChannel(channel);
          return;
        }
        hvChatRealtimeChannelRef.current = channel;
      } catch (e: unknown) {
        if (!cancelled && gen === hvChatEffectGenerationRef.current) failLoad(e);
      }
    })();

    return () => {
      cancelled = true;
      if (browserSb && hvChatRealtimeChannelRef.current) {
        browserSb.removeChannel(hvChatRealtimeChannelRef.current);
        hvChatRealtimeChannelRef.current = null;
      }
    };
  }, [browserSb, lopHocIdForDb, storedSession]);

  const toggleDark = () => {
    setDark((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("phc_dark", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const phcRootClass = cx("phc", fontBody.className, dark && "phc--dark");

  const chatIdRef = useRef(Math.max(...CHAT_SEED.map((m) => m.id), 0));
  /** ID âm cho bubble ảnh lạc quan (chưa upload xong) — không trùng id DB dương. */
  const hvOptimisticChatSeqRef = useRef(0);

  const sendChat = async () => {
    const txt = chatDraft.trim();
    const pendingSnapshot = chatPendingImages.slice();
    if (!txt && pendingSnapshot.length === 0) return;

    if (liveChatEnabled && Number.isFinite(lopHocIdForDb) && storedSession) {
      const qlhvIdForInsert =
        storedSession.userType === "Student" && Number.isFinite(storedSession.data.qlhv_id)
          ? storedSession.data.qlhv_id
          : null;

      /** Ảnh: hiện bubble ngay (blob), upload + insert chạy nền. */
      if (pendingSnapshot.length > 0) {
        hvOptimisticChatSeqRef.current += 1;
        const tempId = -hvOptimisticChatSeqRef.current;
        const createdAt = new Date().toISOString();
        const localPhotoUrls = pendingSnapshot.map((p) => p.previewUrl);

        const optimisticRow: HvChatboxRow = {
          id: tempId,
          created_at: createdAt,
          content: txt.length > 0 ? txt : null,
          photo: localPhotoUrls[0] ?? null,
          photos: localPhotoUrls,
          usertype: storedSession.userType === "Teacher" ? "Teacher" : "Student",
          name: qlhvIdForInsert,
        };

        setHvChatErr(null);
        setHvChatRows((prev) =>
          [optimisticRow, ...prev.filter((p) => p.id !== tempId)].slice(0, 200)
        );
        setChatDraft("");
        setChatPendingImages([]);
        if (chatFileInputRef.current) chatFileInputRef.current.value = "";

        const draftSnapshot = txt;

        void (async () => {
          try {
            const uploads = await Promise.all(
              pendingSnapshot.map((p) => postUploadChatImage(p.file))
            );
            const urls: string[] = [];
            for (const up of uploads) {
              if (!up.ok) throw new Error(up.error);
              urls.push(up.url);
            }
            const row = await apiInsertHvChatboxMessage({
              lopHocId: lopHocIdForDb,
              usertype: storedSession.userType === "Teacher" ? "Teacher" : "Student",
              name: qlhvIdForInsert,
              content: draftSnapshot.length > 0 ? draftSnapshot : null,
              photo: urls[0] ?? null,
              photos: urls,
            });
            if (row.created_at > hvLatestCreatedAtRef.current) {
              hvLatestCreatedAtRef.current = row.created_at;
            }
            hvKnownIdsRef.current.add(row.id);
            setHvChatRows((prev) => {
              const withoutTemp = prev.filter((p) => p.id !== tempId);
              const hasReal = withoutTemp.some((p) => p.id === row.id);
              const next = (hasReal ? withoutTemp : [row, ...withoutTemp]).slice(0, 200);
              try {
                localStorage.setItem(
                  chatCacheKey(lopHocIdForDb),
                  JSON.stringify(next.slice(0, 50))
                );
              } catch {
                /* ignore */
              }
              return next;
            });
            for (const p of pendingSnapshot) {
              if (p.previewUrl.startsWith("blob:")) URL.revokeObjectURL(p.previewUrl);
            }
          } catch (e: unknown) {
            setHvChatRows((prev) => prev.filter((p) => p.id !== tempId));
            setChatDraft(draftSnapshot);
            setChatPendingImages(pendingSnapshot);
            setHvChatErr(e instanceof Error ? e.message : "Gửi ảnh thất bại.");
          }
        })();
        return;
      }

      setHvChatSending(true);
      setHvChatErr(null);
      try {
        const row = await apiInsertHvChatboxMessage({
          lopHocId: lopHocIdForDb,
          usertype: storedSession.userType === "Teacher" ? "Teacher" : "Student",
          name: qlhvIdForInsert,
          content: txt.length > 0 ? txt : null,
          photo: null,
          photos: [],
        });
        if (!hvKnownIdsRef.current.has(row.id)) {
          hvKnownIdsRef.current.add(row.id);
          if (row.created_at > hvLatestCreatedAtRef.current) {
            hvLatestCreatedAtRef.current = row.created_at;
          }
          setHvChatRows((prev) => {
            const merged = [row, ...prev.filter((p) => p.id !== row.id)].slice(0, 200);
            try {
              localStorage.setItem(
                chatCacheKey(lopHocIdForDb),
                JSON.stringify(merged.slice(0, 50))
              );
            } catch {
              /* ignore */
            }
            return merged;
          });
        }
        setChatDraft("");
      } catch (e: unknown) {
        setHvChatErr(e instanceof Error ? e.message : "Gửi tin thất bại.");
      } finally {
        setHvChatSending(false);
      }
      return;
    }

    if (!txt) return;
    chatIdRef.current += 1;
    const now = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    const msg: ChatMsg = {
      id: chatIdRef.current,
      usertype: isTeacher ? "Teacher" : "Student",
      name: isTeacher ? "Giáo viên" : d.full_name,
      colorHex: isTeacher ? "#BC8AF9" : "#4f8ef7",
      content: txt,
      time: now,
    };
    setChatMessages((prev) => [msg, ...prev]);
    setChatDraft("");
  };

  const myStudentId =
    storedSession?.userType === "Student"
      ? Number.isFinite(storedSession.data.id) && storedSession.data.id > 0
        ? storedSession.data.id
        : hvStudentPkResolved
      : null;

  const classCodeShort = useMemo(() => {
    const raw = (d.class_name ?? "").trim();
    if (!raw) return "";
    return raw.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
  }, [d.class_name]);

  const classFilterLabel = useMemo(
    () => (classCodeShort ? `Bài học viên lớp ${classCodeShort}` : "Bài học viên lớp"),
    [classCodeShort],
  );

  const galleryHvTabLabel = useMemo(
    () => (classCodeShort ? `Bài HV lớp ${classCodeShort}` : "Bài học viên"),
    [classCodeShort],
  );

  const filteredGallery = useMemo(() => {
    let source: Artwork[];
    if (gWorkKind === "mau") {
      if (isTeacher && gExerciseFilter !== "all") {
        source = mauExerciseSamples ?? [];
      } else {
        source = globalSamples;
      }
    } else {
      source =
        gFilter === "mine"
          ? myStudentId == null
            ? []
            : artworks.filter((a) => a.ownerStudentId != null && a.ownerStudentId === myStudentId)
          : artworks;
      source = source.filter((a) => !a.mau);
    }
    if (gExerciseFilter === "all") return source;
    const exId = Number(gExerciseFilter);
    if (!Number.isFinite(exId) || exId <= 0) return source;
    if (gWorkKind === "mau" && isTeacher && mauExerciseSamples != null) return source;
    return source.filter((a) => a.exerciseId != null && a.exerciseId === exId);
  }, [
    artworks,
    globalSamples,
    gFilter,
    gWorkKind,
    myStudentId,
    gExerciseFilter,
    isTeacher,
    mauExerciseSamples,
  ]);

  const galleryExerciseOptions = useMemo(() => {
    type Opt = { id: number; order: number | null; label: string };
    const m = new Map<number, Opt>();

    const rowLabel = (order: number | null, title: string, id: number): string => {
      const t = title.trim();
      const num = order != null && order > 0 ? `Bài ${order}` : null;
      if (num && t) return `${num} — ${t}`;
      if (num) return num;
      if (t) return t;
      return `Bài #${id}`;
    };

    for (const ex of galleryLopExercises) {
      const order = ex.bai_so != null && Number.isFinite(ex.bai_so) ? ex.bai_so : null;
      m.set(ex.id, {
        id: ex.id,
        order,
        label: rowLabel(order, ex.ten_bai_tap ?? "", ex.id),
      });
    }

    const source = gWorkKind === "mau" ? globalSamples : artworks;
    for (const a of source) {
      if (a.exerciseId == null || a.exerciseId <= 0) continue;
      if (m.has(a.exerciseId)) continue;
      const order = a.exerciseOrder;
      const title = a.exerciseTitle?.trim() ?? "";
      const ordForLabel = order != null && order > 0 ? order : null;
      m.set(a.exerciseId, {
        id: a.exerciseId,
        order,
        label: rowLabel(ordForLabel, title, a.exerciseId),
      });
    }

    return [...m.values()].sort((a, b) => {
      const oa = a.order ?? Number.MAX_SAFE_INTEGER;
      const ob = b.order ?? Number.MAX_SAFE_INTEGER;
      if (oa !== ob) return oa - ob;
      return a.id - b.id;
    });
  }, [galleryLopExercises, artworks, globalSamples, gWorkKind]);

  useEffect(() => {
    if (gExerciseFilter === "all") return;
    const exId = Number(gExerciseFilter);
    if (!Number.isFinite(exId) || exId <= 0) {
      setGExerciseFilter("all");
      return;
    }
    const stillExists = galleryExerciseOptions.some((opt) => opt.id === exId);
    if (!stillExists) setGExerciseFilter("all");
  }, [gExerciseFilter, galleryExerciseOptions]);

  const myQlhvIdLive =
    storedSession?.userType === "Student" && Number.isFinite(storedSession.data.qlhv_id)
      ? storedSession.data.qlhv_id
      : null;

  const stuCurProgressIdx = useMemo(
    () => curriculumProgressIndex(stuCurrExercises, stuCurrTienDo),
    [stuCurrExercises, stuCurrTienDo]
  );

  const visibleHvChat = hvChatRows.slice(0, hvChatVisibleCount);
  const hvChatHasMore = hvChatRows.length > hvChatVisibleCount;

  const daysRemaining = !isTeacher ? (d.days_remaining ?? null) : null;
  const daysColor =
    isTeacher
      ? "var(--text)"
      : daysRemaining === null
        ? "var(--phc-muted2)"
        : daysRemaining < 0
          ? "var(--pink)"
          : daysRemaining <= 5
            ? "var(--orange)"
            : "var(--text)";

  if (!mounted && normalizedPathSlug !== null) {
    return (
      <div className={phcRootClass}>
        <p style={{ padding: 24, textAlign: "center" }}>Đang tải phòng học…</p>
      </div>
    );
  }

  if (mounted && normalizedPathSlug !== null && !hasRoomAccess) {
    return (
      <div className={phcRootClass}>
        <header className="topbar">
          <div className="topbar-brand">
            <Link href="/" className="topbar-home" aria-label="Về trang chủ">
              ←
            </Link>
            <div className="topbar-title-wrap">
              <div className="phc-eyebrow">Sine Art</div>
              <div className={cx("topbar-title", fontTitle.className)}>{topbarTitle}</div>
            </div>
          </div>
          <div className="topbar-tools">
            <MediaPermissionControl />
            <button
              type="button"
              className="phc-theme-btn"
              onClick={toggleDark}
              aria-pressed={dark}
              aria-label={dark ? "Chuyển giao diện sáng" : "Chuyển giao diện tối"}
            >
              {dark ? "☀️" : "🌙"}
            </button>
          </div>
        </header>
        <div
          className="canvas-wrap canvas-wrap--access-denied"
          onDragStartCapture={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div className="phc-access-denied">
            <div className="phc-access-denied-card" role="status">
              <div className="phc-access-denied-icon" aria-hidden>
                <span className="phc-access-denied-icon-inner">🔒</span>
              </div>
              <h2 className={cx("phc-access-denied-title", fontTitle.className)}>
                Không thể truy cập phòng học này
              </h2>
              <p className="phc-access-denied-desc">
                Chỉ học viên hoặc giáo viên của đúng lớp (đã đăng nhập bằng email) mới vào được. Học
                viên cần còn ngày học trong kỳ.
              </p>
              <div className="phc-access-denied-actions">
                <button
                  type="button"
                  className="phc-re-signin-btn"
                  onClick={() => setAccessDeniedSignInOpen(true)}
                >
                  Đăng nhập lại
                </button>
                <Link href="/" className="phc-access-denied-home" draggable={false}>
                  ← Về trang chủ
                </Link>
              </div>
            </div>
          </div>
        </div>
        <ClassroomSignInOverlay
          open={accessDeniedSignInOpen}
          onClose={() => setAccessDeniedSignInOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className={phcRootClass}>
      <header className="topbar">
        <div className="topbar-brand">
          <Link href="/" className="topbar-home" aria-label="Về trang chủ">
            ←
          </Link>
          <div className="topbar-title-wrap">
            <div className="phc-eyebrow">Sine Art</div>
            <div className={cx("topbar-title", fontTitle.className)}>{topbarTitle}</div>
          </div>
        </div>

        <div className="topbar-tools">
          <MediaPermissionControl />
          <button
            type="button"
            className="phc-theme-btn"
            onClick={toggleDark}
            aria-pressed={dark}
            aria-label={dark ? "Chuyển giao diện sáng" : "Chuyển giao diện tối"}
          >
            {dark ? "☀️" : "🌙"}
          </button>
        </div>

        <div className="topbar-spacer" aria-hidden />

        {!isTeacher && d.email.includes("@") ? (
          <div className="phc-topbar-avatar">
            <StudentAvatarMenu
              email={d.email}
              fullName={d.full_name}
              storedAvatar={
                storedSession?.userType === "Student"
                  ? storedSession.data.hv_avatar?.trim() || undefined
                  : undefined
              }
            />
          </div>
        ) : (
          <div className="sess-wrap">
            <PhcAvatarBubble
              name={d.full_name}
              photoUrl={isTeacher ? d.staff_avatar_url : null}
              className="sess-avatar"
              gradientVar={isTeacher ? "var(--grad-t)" : "var(--grad)"}
            />
            <div>
              <div className="sess-name">{d.full_name}</div>
            </div>
            <span className={cx("sess-tag", isTeacher ? "tag-t" : "tag-s")}>
              {isTeacher ? "Giáo viên" : "Học viên"}
            </span>
          </div>
        )}

        {storedSession == null ? (
          <div className="rolesw" role="group" aria-label="Chế độ xem mẫu">
            <button
              type="button"
              className={cx("rbtn", "rt", isTeacher && "active")}
              onClick={() => {
                setRole("teacher");
                setTab("lop");
              }}
            >
              🎓 Giáo viên
            </button>
            <button
              type="button"
              className={cx("rbtn", "rs", !isTeacher && "active")}
              onClick={() => {
                setRole("student");
                setTab("lop");
              }}
            >
              👤 Học viên
            </button>
          </div>
        ) : null}
      </header>

      <div className="main">
        <LayoutGroup id="phc-main-layout">
          <motion.div layout className="canvas-wrap" transition={PHC_SIDEBAR_TWEEN}>
            {canvasMeetJoinUrl ? (
              <motion.div
                layout
                className="canvas-ph canvas-ph--meet canvas-ph--meet-cta"
                transition={PHC_SIDEBAR_TWEEN}
              >
                <div className="phc-meet-cta-card">
                  <span className="phc-meet-cta-ico" aria-hidden>
                    📹
                  </span>
                  <p className="phc-meet-cta-title">Buổi học trên Google Meet</p>
                  <p className="phc-meet-cta-hint">Mở tab mới để bật camera và micro.</p>
                  <a
                    href={canvasMeetJoinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="phc-meet-cta-btn"
                  >
                    Vào học trên Google Meet
                  </a>
                </div>
              </motion.div>
            ) : (
              <motion.div layout className="canvas-ph" transition={PHC_SIDEBAR_TWEEN}>
                <span className="ico">🎨</span>
                <p>Phòng học trực tuyến</p>
                <small>
                  Chưa có liên kết Google Meet cho hôm nay. Giáo viên lưu link Meet trong bảng điều khiển — link được cập
                  nhật mỗi ngày như trước.
                </small>
              </motion.div>
            )}
          </motion.div>

          <motion.aside
          layout
          className={cx("sb", !sidebarOpen && "col")}
          transition={PHC_SIDEBAR_TWEEN}
        >
          <button
            type="button"
            className="sbtog"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-expanded={sidebarOpen}
            aria-label={sidebarOpen ? "Thu gọn bảng điều khiển" : "Mở bảng điều khiển"}
          >
            <span className="tog-lbl">BẢNG ĐIỀU KHIỂN</span>
            <AnimatePresence initial={false} mode="wait">
              <motion.span
                key={sidebarOpen ? "sidebar-expanded" : "sidebar-collapsed"}
                className="sbtog-ico"
                aria-hidden
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.88 }}
                transition={{ duration: 0.28, ease: PHC_SIDEBAR_EASE }}
              >
                {sidebarOpen ? (
                  <PanelRightClose size={18} strokeWidth={2} />
                ) : (
                  <PanelRightOpen size={18} strokeWidth={2} />
                )}
              </motion.span>
            </AnimatePresence>
          </button>

          <div className="tab-row" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "lop"}
              className={cx("tb", tab === "lop" && "active")}
              onClick={() => setTab("lop")}
            >
              Lớp
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "chat"}
              className={cx("tb", tab === "chat" && "active")}
              onClick={() => setTab("chat")}
            >
              Chat
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "third"}
              className={cx("tb", "ttt", tab === "third" && "active")}
              onClick={() => setTab("third")}
            >
              {isTeacher ? "Bài giảng" : "Bài tập"}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "gallery"}
              className={cx("tb", tab === "gallery" && "active")}
              onClick={() => setTab("gallery")}
            >
              Bài HV
            </button>
          </div>

          <div className="sbody">
            <div className={cx("tc", tab === "lop" && "active")} id="t-lop" role="tabpanel">
              <div className="lop-wrap">
                {isTeacher ? (
                  <>
                    <div className="lop-wrap-head">
                      <div className="ss-card" style={{ borderTop: "3px solid var(--purple)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <PhcAvatarBubble
                            name={d.full_name}
                            photoUrl={d.staff_avatar_url}
                            className="ss-avatar"
                            gradientVar="var(--grad-t)"
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div className="ss-name">{d.full_name}</div>
                              <span className="sess-tag tag-t">GV</span>
                            </div>
                            <div className="ss-sub">{d.class_name}</div>
                          </div>
                        </div>
                        <div className="ss-divider" />
                        <div className="ss-stat-box" style={{ marginBottom: 10 }}>
                          <span className="ss-stat-lbl">Học viên đang học (còn ngày)</span>
                          <span className="ss-stat-val">
                            {storedSession?.userType === "Teacher"
                              ? classmatesReal !== undefined
                                ? classmatesReal.length
                                : storedSession.data.so_hoc_vien
                              : STUDENTS_MOCK.length}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="ss-manage-btn"
                          disabled={!Number.isFinite(d.lop_hoc_id)}
                          onClick={() => setStudentManageOpen(true)}
                        >
                          👥 Quản lý học viên
                        </button>
                      </div>
                    </div>
                    <div className="lop-online-scroll">
                      <span className="section-title">Online trong lớp</span>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                          width: "100%",
                          minWidth: 0,
                        }}
                      >
                        {teacherClassmatesOnlineFirst.map((s) => {
                          const { dot, nameCls } = sidebarAttendanceStyle(s);
                          return (
                            <div key={s.hvId} className="online-row">
                              <div className="o-av" style={{ background: s.c }}>
                                {s.i}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div className={cx("o-name", nameCls)}>{s.n}</div>
                                <div
                                  className={cx(
                                    "o-ex",
                                    classmateEnrollmentShouldHighlightNew(s) && "o-ex--new"
                                  )}
                                  title="Thời gian học tính từ ngày đăng ký lớp (ghi nhận trên hệ thống)."
                                >
                                  {formatClassmateEnrollmentStudyLine(s)}
                                </div>
                              </div>
                              <div className={cx("o-dot", dot)} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="lop-wrap-scroll">
                    {daysRemaining !== null && daysRemaining < 0 ? (
                      <div className="ss-warn">
                        <span style={{ color: "var(--pink)", fontSize: 16 }} aria-hidden>
                          ⚠️
                        </span>
                        <div>
                          <div className="ss-info-lbl" style={{ color: "var(--pink)" }}>
                            GIA HẠN HỌC PHÍ
                          </div>
                          <div className="ss-sub" style={{ marginTop: 3 }}>
                            Vui lòng đóng học phí để tiếp tục học.
                          </div>
                          <Link
                            href="/donghocphi"
                            style={{
                              display: "inline-block",
                              marginTop: 6,
                              padding: "4px 10px",
                              borderRadius: 7,
                              fontSize: 11,
                              fontWeight: 700,
                              color: "#fff",
                              background: "var(--grad)",
                              textDecoration: "none",
                            }}
                          >
                            Gia hạn →
                          </Link>
                        </div>
                      </div>
                    ) : null}
                    <div className="ss-card" style={{ borderTop: "3px solid var(--pink)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <PhcAvatarBubble
                          name={d.full_name}
                          photoUrl={null}
                          className="ss-avatar"
                          gradientVar="var(--grad)"
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="ss-name">{d.full_name}</div>
                          <div className="ss-sub">{d.email}</div>
                        </div>
                      </div>
                      <div className="ss-divider" />
                      <div className="ss-stu-stats">
                        <div className="ss-stu-stat">
                          <span className="ss-stu-stat-lbl">Ngày còn lại</span>
                          <span
                            className="ss-stu-stat-num ss-days-big"
                            style={{ color: daysColor }}
                            title="Theo kỳ học phí đã thanh toán — chưa cộng buổi từ gói đang chọn ở bước Đóng học phí (chưa thanh toán)."
                          >
                            {daysRemaining === null ? "—" : daysRemaining}
                          </span>
                          <span className="ss-stu-stat-hint">đã thanh toán</span>
                        </div>
                        <div className="ss-stu-stat">
                          <span className="ss-stu-stat-lbl">Năm thi</span>
                          <span className="ss-stu-stat-num ss-stu-year">
                            {d.nam_thi != null ? String(d.nam_thi) : "—"}
                          </span>
                          <span className="ss-stu-stat-hint">dự kiến</span>
                        </div>
                      </div>
                      <div className="ss-stu-tn">
                        <p className="ss-stu-tn-title">Trường &amp; ngành dự thi</p>
                        {studentTnPairs.length ? (
                          <ul className="ss-stu-tn-list">
                            {studentTnPairs.map((pair, i) => (
                              <li key={`${pair.truong}-${pair.nganh}-${i}`} className="ss-stu-tn-item">
                                <span className="ss-stu-tn-ix" aria-hidden>
                                  {i + 1}
                                </span>
                                <div className="ss-stu-tn-body">
                                  <span className="ss-stu-tn-school">{pair.truong}</span>
                                  <span className="ss-stu-tn-major">{pair.nganh}</span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="ss-stu-tn-empty">Chưa khai báo</p>
                        )}
                      </div>
                      <div className="ss-stu-gv">
                        <span className="ss-stu-gv-lbl">Giáo viên</span>
                        <span className="ss-stu-gv-val">{d.teacher_name}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={cx("tc", tab === "chat" && "active")} role="tabpanel">
              <div className="chat-wrap">
                {teacherSaveChatNotice ? (
                  <div className="chat-save-toast" role="status" aria-live="polite">
                    {teacherSaveChatNotice}
                  </div>
                ) : null}
                <div className="chat-msgs">
                  {liveChatEnabled ? (
                    <>
                      {visibleHvChat.map((m) => {
                        const qlhvKey = parseQlhvKey(m.name);
                        const isGV = m.usertype === "Teacher";
                        const isMe = isGV
                          ? isTeacher
                          : !isTeacher &&
                            myQlhvIdLive != null &&
                            qlhvKey != null &&
                            qlhvKey === myQlhvIdLive;
                        const stuData =
                          qlhvKey != null && !isGV ? chatStudentByQlhv[qlhvKey] : undefined;
                        const senderName = isGV
                          ? isMe
                            ? d.full_name.trim() || "Giáo viên"
                            : d.teacher_name?.trim() || "Giáo viên"
                          : (stuData?.name ?? "Học viên");
                        const curEx =
                          stuData?.exId != null && Number.isFinite(stuData.exId)
                            ? chatExMap[stuData.exId]
                            : undefined;
                        const exColor = curEx ? chatSubjectColor(curEx.mon) : "#a78bfa";
                        const exTotal = curEx ? (chatTotalByMon[curEx.mon] ?? 0) : 0;
                        const gvBubblePhoto = isGV
                          ? isTeacher
                            ? d.staff_avatar_url
                            : chatClassTeacherAvatarUrl
                          : null;
                        const albumUrls = (m.photos?.length ? m.photos : []).filter(
                          (u) => u.trim().length > 0
                        );
                        const hasPhotos = albumUrls.length > 0;
                        return (
                          <div key={m.id} className={cx("cmsg", isMe && "me")}>
                            <div className={cx("cbub", isMe ? "me" : "them")}>
                              <div className="csender">
                                {isGV ? (
                                  <PhcAvatarBubble
                                    name={senderName}
                                    photoUrl={gvBubblePhoto}
                                    className="chat-gv-av"
                                    gradientVar="var(--grad-t)"
                                  />
                                ) : (
                                  <ChatMiniRing
                                    order={curEx?.order ?? 0}
                                    total={exTotal}
                                    color={exColor}
                                    onTeacherPickProgress={
                                      isTeacher && stuData && browserSb
                                        ? () => void openChatProgressFromChat(stuData)
                                        : undefined
                                    }
                                  />
                                )}
                                <span className="csender-name">{senderName}</span>
                                {isGV ? <span className="gv-tag">GV</span> : null}
                                {!isGV &&
                                enrollmentHighlightNewFromIso(stuData?.enrollmentCreatedAt ?? null) ? (
                                  <span className="chat-new-tag" title="Ghi danh lớp dưới 7 ngày">
                                    NEW
                                  </span>
                                ) : null}
                              </div>
                              {hasPhotos ? (
                                <div
                                  className={cx(
                                    "chat-photo-wrap",
                                    albumUrls.length > 1 && "chat-photo-wrap--album",
                                    m.id < 0 && "chat-photo-wrap--pending"
                                  )}
                                >
                                  <div
                                    className={cx(
                                      "chat-photo-grid",
                                      albumUrls.length === 1 && "chat-photo-grid--one",
                                      albumUrls.length === 2 && "chat-photo-grid--two",
                                      albumUrls.length >= 3 && "chat-photo-grid--many"
                                    )}
                                  >
                                    {albumUrls.map((src, ix) => (
                                      <button
                                        key={`${m.id}-${ix}-${src.slice(0, 64)}`}
                                        type="button"
                                        className="chat-photo-btn"
                                        onClick={() => setChatFullImg(src.trim())}
                                        aria-label="Phóng to ảnh"
                                      >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={src.trim()} alt="" className="chat-cphoto" />
                                      </button>
                                    ))}
                                  </div>
                                  {m.id < 0 ? (
                                    <p className="chat-upload-pending" aria-live="polite">
                                      Đang tải ảnh lên…
                                    </p>
                                  ) : null}
                                  {isTeacher &&
                                  !isGV &&
                                  qlhvKey != null &&
                                  m.id > 0 &&
                                  storedSession?.userType === "Teacher" &&
                                  Number.isFinite(storedSession.data.id) ? (
                                    <button
                                      type="button"
                                      className={cx(
                                        "chat-teacher-save-btn",
                                        teacherChatSaved[m.id] && "is-saved"
                                      )}
                                      disabled={
                                        Boolean(teacherSaveChatBusy[m.id]) || Boolean(teacherChatSaved[m.id])
                                      }
                                      title={
                                        teacherChatSaved[m.id]
                                          ? "Đã lưu vào bài học viên (chờ xác nhận)"
                                          : albumUrls.length > 1
                                            ? "Lưu ảnh đầu tiên vào bài học viên (chờ xác nhận)"
                                            : "Lưu vào bài học viên (chờ xác nhận)"
                                      }
                                      onClick={(ev) => {
                                        ev.stopPropagation();
                                        if (teacherChatSaved[m.id]) return;
                                        void handleTeacherSaveChatPhoto(m, qlhvKey);
                                      }}
                                    >
                                      {teacherChatSaved[m.id]
                                        ? "Đã lưu"
                                        : teacherSaveChatBusy[m.id]
                                          ? "Đang lưu…"
                                          : "Lưu bài"}
                                    </button>
                                  ) : null}
                                </div>
                              ) : null}
                              {m.content?.trim() ? (
                                <div className="chat-cbody">{m.content}</div>
                              ) : null}
                              <div className="ctime">{formatChatTime(m.created_at)}</div>
                            </div>
                          </div>
                        );
                      })}
                      {hvChatHasMore ? (
                        <div className="chat-load-more-wrap">
                          <button
                            type="button"
                            className="chat-load-more"
                            disabled={hvChatLoadingMore}
                            onClick={() => {
                              setHvChatLoadingMore(true);
                              window.setTimeout(() => {
                                setHvChatVisibleCount((n) => n + HV_CHAT_LOAD_MORE);
                                setHvChatLoadingMore(false);
                              }, 180);
                            }}
                          >
                            {hvChatLoadingMore
                              ? "Đang tải…"
                              : `Xem thêm (còn ${hvChatRows.length - hvChatVisibleCount} tin)`}
                          </button>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    chatMessages.map((m) => {
                      const isGV = m.usertype === "Teacher";
                      const isMe = isGV ? isTeacher : !isTeacher && m.name === d.full_name;
                      return (
                        <div key={m.id} className={cx("cmsg", isMe && "me")}>
                          <div
                            className="mini-ring"
                            style={{
                              background: isGV
                                ? "var(--grad-t)"
                                : `linear-gradient(135deg,${m.colorHex},${m.colorHex}bb)`,
                            }}
                          >
                            {isGV ? "GV" : m.name.charAt(0)}
                          </div>
                          <div className={cx("cbub", isMe ? "me" : "them")}>
                            <div className="csender">
                              {m.name}
                              {isGV ? <span className="gv-tag">GV</span> : null}
                            </div>
                            <div>{m.content}</div>
                            <div className="ctime">{m.time}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                {liveChatEnabled && chatPendingImages.length > 0 ? (
                  <div className="chat-preview-row">
                    <div className="chat-preview-strip" role="list">
                      {chatPendingImages.map((p) => (
                        <span key={p.key} className="chat-preview-item" role="listitem">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.previewUrl} alt="" className="chat-preview-thumb" />
                          <button
                            type="button"
                            className="chat-preview-x"
                            onClick={() => removeChatPendingImage(p.key)}
                            aria-label="Bỏ ảnh đính kèm"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    {chatPendingImages.length >= HV_CHAT_MAX_IMAGES ? (
                      <span className="chat-preview-cap-hint">Đã đạt tối đa {HV_CHAT_MAX_IMAGES} ảnh</span>
                    ) : null}
                  </div>
                ) : null}
                {liveChatEnabled && hvChatErr ? (
                  <div className="chat-err-bar" role="alert">
                    {hvChatErr}
                  </div>
                ) : null}
                <div className="chat-input-row">
                  <input
                    ref={chatFileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="phc-sr-only"
                    id="phc-chat-file"
                    onChange={(e) => {
                      const list = e.target.files;
                      if (!list?.length) return;
                      appendChatImageFiles(Array.from(list));
                      e.target.value = "";
                    }}
                  />
                  <label
                    htmlFor={liveChatEnabled ? "phc-chat-file" : undefined}
                    className={cx("chat-img-lbl", !liveChatEnabled && "chat-img-lbl--off")}
                    title={
                      liveChatEnabled
                        ? "Đính kèm ảnh (nhiều ảnh, hoặc Ctrl+V dán ảnh)"
                        : "Đăng nhập lớp để gửi ảnh và tin thật"
                    }
                  >
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M3 3h18v18H3zM8.5 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM21 15l-5-5L5 21"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    </svg>
                  </label>
                  <input
                    className="chat-in"
                    placeholder={
                      liveChatEnabled ? "Nhập tin nhắn…" : "Nhắn tin (chế độ xem mẫu)…"
                    }
                    value={chatDraft}
                    onChange={(e) => setChatDraft(e.target.value)}
                    onPaste={(e) => {
                      if (!liveChatEnabled) return;
                      const items = e.clipboardData?.items;
                      if (!items?.length) return;
                      const files: File[] = [];
                      for (let i = 0; i < items.length; i++) {
                        const it = items[i];
                        if (it?.kind === "file" && it.type.startsWith("image/")) {
                          const f = it.getAsFile();
                          if (f) files.push(f);
                        }
                      }
                      if (files.length === 0) return;
                      e.preventDefault();
                      appendChatImageFiles(files);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void sendChat();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="chat-send-btn"
                    onClick={() => void sendChat()}
                    disabled={
                      hvChatSending || (!chatDraft.trim() && chatPendingImages.length === 0)
                    }
                    aria-label="Gửi"
                  >
                    {hvChatSending ? (
                      <span style={{ fontSize: 11, fontWeight: 700 }}>…</span>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path
                          d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className={cx("tc", tab === "third" && "active")} role="tabpanel">
                <div className="task-panel">
                  {!liveChatEnabled ? (
                    <div className="task-curr-nologin">
                      {isTeacher
                        ? "Đăng nhập lớp để xem hệ thống bài giảng theo môn của lớp."
                        : "Đăng nhập lớp để xem danh sách bài tập theo môn và tiến độ mở bài (đồng bộ với hệ thống)."}
                    </div>
                  ) : stuCurrLoading && stuCurrExercises.length === 0 ? (
                    <div className="task-curr-loading">Đang tải chương trình bài…</div>
                  ) : stuCurrErr ? (
                    <div className="task-curr-err">{stuCurrErr}</div>
                  ) : (
                    <>
                      {stuCurrLoading ? (
                        <div className="task-curr-refresh" aria-live="polite">
                          Đang cập nhật…
                        </div>
                      ) : null}
                      {isTeacher ? (
                        <div className="task-progress-card">
                          <div className="task-progress-head">
                            <h3 className="task-progress-title">Hệ thống bài giảng</h3>
                            {stuCurrSubject ? (
                              <span className="task-progress-mon">{stuCurrSubject}</span>
                            ) : null}
                          </div>
                          <div className="task-progress-body">
                            <p className="task-progress-note">
                              Toàn bộ bài giảng thuộc môn của lớp. Bấm vào bài để xem hướng dẫn giảng dạy.
                            </p>
                            <div className="task-progress-bar">
                              <div className="prog-lbl">
                                <span>Tổng số bài</span>
                                <span>{stuCurrExercises.length}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                      <div className="task-progress-card">
                        <div className="task-progress-head">
                          <h3 className="task-progress-title">Tiến độ hiện tại</h3>
                          {stuCurrSubject ? (
                            <span className="task-progress-mon">{stuCurrSubject}</span>
                          ) : null}
                        </div>
                        <div className="task-progress-body">
                          {stuCurProgressIdx >= 0 ? (
                            <>
                              <div className="task-progress-now">
                                <span className="task-progress-pill">Đang học</span>
                                <p className="task-progress-lesson">
                                  <span className="task-progress-lesson-num">
                                    {formatLessonLabel(
                                      stuCurrExercises[stuCurProgressIdx]!,
                                      stuCurProgressIdx
                                    )}
                                  </span>
                                  <span className="task-progress-dot" aria-hidden>
                                    ·
                                  </span>
                                  <span className="task-progress-lesson-name">
                                    {stuCurrExercises[stuCurProgressIdx]!.ten_bai_tap}
                                  </span>
                                </p>
                              </div>
                              <p className="task-progress-note">
                                Tiến độ do giáo viên gán cho lớp. Bài sau mở khi được cập nhật.
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="task-progress-lesson task-progress-lesson--empty">
                                Chưa gán bài đang học
                              </p>
                              <p className="task-progress-note">
                                Khi giáo viên gán tiến độ, bạn sẽ xem được các bài theo lộ trình từ đầu đến bài
                                đó.
                              </p>
                            </>
                          )}
                          <div className="task-progress-bar">
                            <div className="prog-lbl">
                              <span>Đã mở / tổng bài</span>
                              <span>
                                {stuCurProgressIdx >= 0 ? stuCurProgressIdx + 1 : 0}/{stuCurrExercises.length}
                              </span>
                            </div>
                            <div className="prog-track">
                              <div
                                className="prog-fill"
                                style={{
                                  width:
                                    stuCurrExercises.length > 0 && stuCurProgressIdx >= 0
                                      ? `${((stuCurProgressIdx + 1) / stuCurrExercises.length) * 100}%`
                                      : "0%",
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      )}
                      {stuCurrExercises.length === 0 ? (
                        <div className="task-curr-empty">
                          {isTeacher
                            ? "Chưa có bài giảng nào cho môn của lớp này."
                            : "Chưa có bài tập nào cho môn của lớp này."}
                        </div>
                      ) : (
                        <div className="task-curr-list-wrap">
                          <div className="task-curr-list-heading">
                            {isTeacher ? "Danh sách bài giảng theo môn" : "Danh sách bài theo môn"}
                          </div>
                          <div className="task-curr-list" role="list">
                          {stuCurrExercises.map((ex, i) => {
                            const unlocked = isTeacher ? true : stuCurProgressIdx >= 0 && i <= stuCurProgressIdx;
                            const isCurrent = !isTeacher && i === stuCurProgressIdx;
                            const expanded = taskDetailOpenId === ex.id && unlocked;
                            const baiSoSlug =
                              ex.bai_so != null && Number.isFinite(ex.bai_so) ? ex.bai_so : i + 1;
                            const baiTapHref = buildHeThongBaiTapHref(
                              baiSoSlug,
                              ex.ten_bai_tap,
                              stuCurrMonId
                            );
                            const thumbSrc = cfImageForThumbnail(ex.thumbnail) ?? ex.thumbnail?.trim() ?? null;
                            return (
                              <div
                                key={ex.id}
                                className={cx(
                                  "task-curr-row",
                                  !unlocked && "task-curr-row--locked",
                                  isCurrent && "task-curr-row--current"
                                )}
                                role="listitem"
                              >
                                <button
                                  type="button"
                                  className="task-curr-row-btn"
                                  disabled={!unlocked}
                                  title={
                                    unlocked
                                      ? expanded
                                        ? "Thu gọn"
                                        : isTeacher
                                          ? "Mở xem nút mở hướng dẫn giảng dạy"
                                          : "Mở xem tóm tắt và nút hướng dẫn"
                                      : "Giáo viên sẽ mở bài này khi bạn hoàn thành các bài trước"
                                  }
                                  onClick={() => {
                                    if (!unlocked) return;
                                    setTaskDetailOpenId((id) => (id === ex.id ? null : ex.id));
                                  }}
                                >
                                  {thumbSrc ? (
                                    <div className="task-curr-row-thumb">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={thumbSrc} alt="" />
                                    </div>
                                  ) : (
                                    <div className="task-curr-row-thumb task-curr-row-thumb--empty" aria-hidden>
                                      <span className="task-curr-row-thumb-ph">Ảnh</span>
                                    </div>
                                  )}
                                  <div className="task-curr-row-text">
                                    <div className="task-curr-row-main">
                                      <span className="task-curr-badge">{formatLessonLabel(ex, i)}</span>
                                      <span className="task-curr-row-title">{ex.ten_bai_tap}</span>
                                    </div>
                                    <span className="task-curr-row-chevron" aria-hidden>
                                      {unlocked ? (expanded ? "▴" : "▾") : "🔒"}
                                    </span>
                                  </div>
                                </button>
                                {expanded && unlocked ? (
                                  <div className="task-curr-detail">
                                    <p className="task-curr-detail-txt">{ex.ten_bai_tap}</p>
                                    <Link
                                      href={baiTapHref}
                                      className="task-curr-open-btn"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {isTeacher ? "Xem bài giảng" : "Xem hướng dẫn bài tập"}
                                    </Link>
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

            <div className={cx("tc", tab === "gallery" && "active")} role="tabpanel">
              <div className="gallery-panel">
                <div className="gallery-toolbar">
                  {gWorkKind === "mau" ? (
                    <span className="gtag gtag-readonly">Tất cả bài mẫu (mọi lớp)</span>
                  ) : (
                    <>
                      {!isTeacher ? (
                        <button
                          type="button"
                          className={cx("gtag", gFilter === "mine" && "active")}
                          onClick={() => setGFilter("mine")}
                        >
                          Bài của bạn
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className={cx("gtag", gFilter === "class" && "active")}
                        onClick={() => setGFilter("class")}
                      >
                        {classFilterLabel}
                      </button>
                    </>
                  )}
                  {isTeacher ? (
                    <button type="button" className="gallery-add-mau-btn" onClick={openBaiMauModal}>
                      Thêm bài mẫu
                    </button>
                  ) : null}
                  {isTeacher ? (
                    <select
                      className="gallery-cls-filter"
                      value={gExerciseFilter}
                      onChange={(e) => setGExerciseFilter(e.target.value)}
                      aria-label="Lọc theo bài tập"
                    >
                      <option value="all">Tất cả bài</option>
                      {galleryExerciseOptions.map((opt) => (
                        <option key={opt.id} value={String(opt.id)}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
                {isTeacher ? (
                  <div className="gallery-kind-tabs" role="tablist" aria-label="Loại tranh">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={gWorkKind === "hv"}
                      className={cx("gallery-kind-tab", gWorkKind === "hv" && "active")}
                      onClick={() => setGWorkKind("hv")}
                    >
                      {galleryHvTabLabel}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={gWorkKind === "mau"}
                      className={cx("gallery-kind-tab", gWorkKind === "mau" && "active")}
                      onClick={() => setGWorkKind("mau")}
                    >
                      Bài mẫu
                    </button>
                  </div>
                ) : null}
                <div className="gallery-grid">
                  {(gWorkKind === "mau"
                    ? globalSamplesLoading || (isTeacher && mauExerciseLoading)
                    : galleryLoading) ? (
                    <div className="gallery-grid-loading">
                      {gWorkKind === "mau" ? "Đang tải bài mẫu…" : "Đang tải tác phẩm…"}
                    </div>
                  ) : filteredGallery.length === 0 ? (
                    <div className="gallery-grid-empty">
                      {gWorkKind === "mau"
                        ? gExerciseFilter !== "all"
                          ? "Chưa có bài mẫu cho mục bài đã chọn."
                          : lopTenMonHocLabel
                            ? `Chưa có bài mẫu Hoàn thiện cho môn ${lopTenMonHocLabel}.`
                            : lopMonHocIdForSamples != null
                              ? "Chưa có bài mẫu Hoàn thiện cho môn của lớp này."
                              : "Chưa có bài mẫu nào trong hệ thống."
                        : gFilter === "mine"
                          ? "Bạn chưa có bài hoàn thiện trong lớp này."
                          : gExerciseFilter !== "all"
                            ? "Chưa có bài hoàn thiện cho mục bài đã chọn."
                            : "Chưa có bài hoàn thiện trong lớp này."}
                    </div>
                  ) : (
                  <>
                    {filteredGallery.map((a, i) => {
                      const thumb =
                        a.photo?.trim() != null && a.photo.trim() !== ""
                          ? cfImageForThumbnail(a.photo.trim()) ?? a.photo.trim()
                          : null;
                      return (
                        <div
                          key={a.hvId > 0 ? `hv-${a.hvId}` : `demo-${a.n}-${i}`}
                          role="button"
                          tabIndex={0}
                          className="gcard"
                          onClick={() => setLightbox(a)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setLightbox(a);
                            }
                          }}
                        >
                          {a.mau ? <div className="gmau-tag">✦ MẪU</div> : null}
                          <div className="gimg">
                            {thumb ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={thumb} alt={a.n} className="gimg-thumb" />
                            ) : (
                              a.e
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {gWorkKind === "mau" && globalSamplesHasMore && gExerciseFilter === "all" ? (
                      <div ref={loadMoreSentinelRef} className="gallery-load-more">
                        <button
                          type="button"
                          className="gallery-load-more-btn"
                          onClick={() => void loadMoreGlobalSamples()}
                          disabled={globalSamplesLoadingMore}
                        >
                          {globalSamplesLoadingMore ? "Đang tải thêm…" : "Tải thêm bài mẫu"}
                        </button>
                      </div>
                    ) : null}
                  </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {lopDevice === "Laptop" ? null : (
            <div className="meet-area">
              {isTeacher ? (
                <>
                  {gmeetFormOpen ? (
                    <>
                      <input
                        className="meet-input"
                        placeholder="Paste link Meet vào đây..."
                        value={gmeetInput}
                        onChange={(e) => setGmeetInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void saveGoogleMeetUrl();
                        }}
                        autoFocus
                      />
                      <button
                        type="button"
                        className="phc-btn-green phc-btn-block"
                        disabled={gmeetSaving}
                        onClick={() => void saveGoogleMeetUrl()}
                      >
                        {gmeetSaving ? "Đang lưu…" : "Lưu link"}
                      </button>
                      <button
                        type="button"
                        className="dhp-btn-ghost phc-btn-block"
                        disabled={gmeetSaving}
                        onClick={() => {
                          setGmeetFormOpen(false);
                          setGmeetInput("");
                        }}
                      >
                        Huỷ
                      </button>
                      {googleMeetUrl?.trim() ? (
                        <button
                          type="button"
                          className="meet-clear-link"
                          disabled={gmeetSaving}
                          onClick={() => void clearGoogleMeetUrl()}
                        >
                          {gmeetSaving ? "Đang chuyển…" : "Học trong phòng học Sine Art"}
                        </button>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="dhp-btn phc-btn-block"
                        onClick={() => {
                          window.open("https://meet.new", "_blank", "noopener,noreferrer");
                          setGmeetFormOpen(true);
                        }}
                      >
                        {gmeetJustSaved ? "✓ Đã lưu link!" : "📹 Tạo Google Meet"}
                      </button>
                      {googleMeetUrl?.trim() ? (
                        <button
                          type="button"
                          className="meet-clear-link"
                          disabled={gmeetSaving}
                          onClick={() => void clearGoogleMeetUrl()}
                        >
                          {gmeetSaving ? "Đang chuyển…" : "Học trong phòng học Sine Art"}
                        </button>
                      ) : null}
                    </>
                  )}
                </>
              ) : studentSidebarMeetUrl ? (
                <button
                  type="button"
                  className="dhp-btn phc-btn-block"
                  onClick={() =>
                    window.open(studentSidebarMeetUrl, "_blank", "noopener,noreferrer")
                  }
                >
                  Tham gia lớp học
                </button>
              ) : (
                <button type="button" className="meet-wait" disabled>
                  {gmeetRowReady ? "Chờ giáo viên tạo Meet..." : "Đang tải..."}
                </button>
              )}
            </div>
          )}
          </motion.aside>
        </LayoutGroup>
      </div>

      {hasAdImage ? (
        <div className={cx("adb", adDismissal !== "banner" && "hid")}>
          <div className="adinner">
            <img
              className="adimg"
              src={adSrc}
              alt="Quảng cáo Sine Art"
            />
            <button
              type="button"
              className="adx"
              onClick={() => setAdDismissal("pill")}
              aria-label="Thu gọn quảng cáo"
            >
              ✕
            </button>
          </div>
        </div>
      ) : null}
      {hasAdImage ? (
        <div className={cx("adpw", adDismissal === "pill" && "vis")}>
          <div className="ad-pill-wrap">
            <button
              type="button"
              className="adpill"
              onClick={() => setAdDismissal("banner")}
            >
              📢 Quảng cáo
            </button>
            <button
              type="button"
              className="adpill-dismiss"
              onClick={() => setAdDismissal("none")}
              aria-label="Ẩn quảng cáo"
            >
              ✕
            </button>
          </div>
        </div>
      ) : null}

      {baiMauModalOpen ? (
        <div
          className="phc-bai-mau-overlay"
          role="dialog"
          aria-modal
          aria-labelledby="phc-bai-mau-title"
          onClick={(e) => e.target === e.currentTarget && closeBaiMauModal()}
        >
          <div className="phc-bai-mau-panel" onClick={(e) => e.stopPropagation()}>
            <div className="phc-bai-mau-head">
              <div className="phc-bai-mau-head-icon" aria-hidden>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <path d="M17 21v-8h-10v8M7 3v5h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </div>
              <div className="phc-bai-mau-head-text">
                <div id="phc-bai-mau-title" className="phc-bai-mau-title">
                  Lưu bài học viên
                </div>
                <div className="phc-bai-mau-sub">Phòng học Sine Art · Bài mẫu (Ẩn Danh)</div>
              </div>
              <button
                type="button"
                className="phc-bai-mau-x"
                onClick={closeBaiMauModal}
                aria-label="Đóng"
              >
                ×
              </button>
            </div>

            <div className="phc-bai-mau-preview-wrap">
              <div className="phc-bai-mau-preview-stage">
                {baiMauPreviewUrl || /^https:\/\//i.test(baiMauPhotoUrl.trim()) ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={(baiMauPreviewUrl ?? baiMauPhotoUrl.trim()) || ""}
                    alt=""
                    className="phc-bai-mau-preview-img"
                  />
                ) : (
                  <div className="phc-bai-mau-preview-ph">
                    <span className="phc-bai-mau-preview-line">Chọn ảnh hoặc dán link</span>
                    <span className="phc-bai-mau-preview-line">Hoặc Ctrl+V để dán ảnh</span>
                  </div>
                )}
              </div>
              <div className="phc-bai-mau-preview-toolbar">
                {baiMauUploading ? (
                  <div
                    className="phc-bai-mau-progress"
                    role="progressbar"
                    aria-busy="true"
                    aria-valuetext="Đang tải ảnh"
                  >
                    <div className="phc-bai-mau-progress-track">
                      <div className="phc-bai-mau-progress-indeterminate" />
                    </div>
                    <span className="phc-bai-mau-progress-label">Đang tải ảnh…</span>
                  </div>
                ) : null}
                <div className="phc-bai-mau-preview-toolbar-row">
                  <button
                    type="button"
                    className="phc-bai-mau-file-btn"
                    disabled={baiMauUploading || baiMauSaving}
                    onClick={() => baiMauFileInputRef.current?.click()}
                  >
                    {baiMauUploading ? "Đang tải…" : "Chọn ảnh"}
                  </button>
                  <input
                    type="text"
                    className="phc-bai-mau-link-input"
                    value={baiMauPhotoUrl}
                    onChange={(e) => setBaiMauPhotoUrl(e.target.value)}
                    placeholder="Hoặc dán link ảnh…"
                    disabled={baiMauUploading || baiMauSaving}
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </div>
                {baiMauErr ? (
                  <p className="phc-bai-mau-err" role="alert">
                    {baiMauErr}
                  </p>
                ) : null}
              </div>
              <input
                ref={baiMauFileInputRef}
                type="file"
                accept="image/*"
                className="phc-sr-only"
                aria-hidden
                onChange={onBaiMauPickFile}
              />
            </div>

            <div className="phc-bai-mau-fields">
              <label className="phc-bai-mau-field">
                <span className="phc-bai-mau-label">Bài tập</span>
                <select
                  className="phc-bai-mau-select"
                  value={baiMauExerciseId}
                  onChange={(e) => setBaiMauExerciseId(e.target.value)}
                  disabled={baiMauExercisesLoading || baiMauExercises.length === 0}
                >
                  <option value="">— Chọn bài tập —</option>
                  {baiMauExercises.map((ex, i) => (
                    <option key={ex.id} value={String(ex.id)}>
                      {formatLessonLabel(ex, i)} · {ex.ten_bai_tap}
                    </option>
                  ))}
                </select>
              </label>
              <label className="phc-bai-mau-check phc-bai-mau-check--disabled">
                <input type="checkbox" checked readOnly disabled />
                <span>✦ Bài mẫu</span>
              </label>
            </div>

            <div className="phc-bai-mau-footer">
              <button type="button" className="phc-bai-mau-btn-cancel" onClick={closeBaiMauModal}>
                Hủy
              </button>
              <button
                type="button"
                className="phc-bai-mau-btn-save"
                disabled={!baiMauCanSave}
                onClick={() => void submitBaiMau()}
              >
                {baiMauSaving ? "Đang lưu…" : "Lưu bài"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {chatFullImg ? (
        <div
          className="chat-fullimg-overlay"
          role="dialog"
          aria-modal
          aria-label="Ảnh chat"
          onClick={(e) => e.target === e.currentTarget && setChatFullImg(null)}
        >
          <button
            type="button"
            className="chat-fullimg-close"
            onClick={() => setChatFullImg(null)}
            aria-label="Đóng"
          >
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={chatFullImg} alt="" className="chat-fullimg-img" />
        </div>
      ) : null}

      {lightbox != null ? (
        <div
          className="lightbox"
          role="dialog"
          aria-modal
          aria-label="Xem ảnh"
          onClick={(e) => e.target === e.currentTarget && setLightbox(null)}
        >
          <button type="button" className="lb-close" onClick={() => setLightbox(null)} aria-label="Đóng">
            ×
          </button>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                lightbox.photo?.trim()
                  ? (cfImageForLightbox(lightbox.photo.trim()) ?? lightbox.photo.trim())
                  : `https://placehold.co/600x450/FFF0EC/EE5CA2?text=${encodeURIComponent(lightbox.n)}`
              }
              alt={lightbox.n}
            />
            <div className="lb-meta">
              <span className="lb-name">{lightbox.n}</span>
              {lightbox.exerciseTitle || lightbox.tenMonHoc || lightbox.exerciseLabel ? (
                <div className="lb-detail">
                  {lightbox.exerciseTitle ? (
                    <span className="lb-ex">{lightbox.exerciseTitle}</span>
                  ) : null}
                  {lightbox.exerciseLabel || lightbox.tenMonHoc ? (
                    <span className="lb-sub">
                      {[lightbox.exerciseLabel, lightbox.tenMonHoc].filter(Boolean).join(" · ")}
                    </span>
                  ) : null}
                </div>
              ) : null}
              <span className="lb-chip">{lightbox.cls}</span>
              {lightbox.mau ? <span className="lb-mau">✦ Bài mẫu</span> : null}
              {lightbox.score != null ? <span className="lb-score">★ {lightbox.score}</span> : null}
            </div>
          </div>
        </div>
      ) : null}

      {chatProgressPicker ? (
        <div
          className="phc-chat-progress-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setChatProgressPicker(null);
          }}
        >
          <div
            className="phc-chat-progress-panel"
            role="dialog"
            aria-modal
            aria-label="Gán tiến độ bài cho học viên"
            onClick={(e) => e.stopPropagation()}
          >
            {chatProgressPicker.phase === "loading" ? (
              <div className="phc-chat-progress-loading">Đang tải danh sách bài…</div>
            ) : null}
            {chatProgressPicker.phase === "error" ? (
              <div className="phc-chat-progress-error">
                <p>{chatProgressPicker.message}</p>
                <button type="button" className="phc-chat-progress-close" onClick={() => setChatProgressPicker(null)}>
                  Đóng
                </button>
              </div>
            ) : null}
            {chatProgressPicker.phase === "ready" &&
            browserSb &&
            Number.isFinite(lopHocIdForDb) &&
            Number.isFinite(teacherHrIdForDb) ? (
              <StudentManageLessonPicker
                key={chatProgressPicker.data.student.enrollmentId}
                student={chatProgressPicker.data.student}
                exBySubject={chatProgressPicker.data.exBySubject}
                allSubjects={chatProgressPicker.data.allSubjects}
                lopTenMonHoc={chatProgressPicker.data.lopTenMonHoc}
                filterSubjectFallback={chatProgressPicker.data.filterSubjectFallback}
                lopHocId={lopHocIdForDb}
                teacherHrId={teacherHrIdForDb}
                onSave={() => {
                  if (browserSb && Number.isFinite(lopHocIdForDb)) {
                    void fetchChatStudentMapByQlhv(browserSb, lopHocIdForDb).then(setChatStudentByQlhv);
                  }
                  refetchTeacherClassmates();
                  setChatProgressPicker(null);
                }}
                onBack={() => setChatProgressPicker(null)}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      <StudentManageModal
        open={studentManageOpen}
        onClose={() => setStudentManageOpen(false)}
        lopHocId={d.lop_hoc_id}
        classDisplayName={d.class_name}
        teacherHrId={Number.isFinite(teacherHrIdForDb) ? teacherHrIdForDb : 0}
        onAfterProgressSave={refetchTeacherClassmates}
      />
    </div>
  );
}
