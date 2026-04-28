"use client";

import {
  CLASSROOM_SESSION_CHANGED_EVENT,
  CLASSROOM_SESSION_STORAGE_KEY,
  parseClassroomSession,
  saveClassroomSession,
  type ClassroomSessionRecord,
} from "@/lib/phong-hoc/classroom-session";
import {
  fetchClassmatesForLop,
  formatClassmateProgressLine,
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
  apiPollHvChatboxAfter,
  chatCacheKey,
  chatSubjectColor,
  fetchChatExerciseIndex,
  fetchChatStudentMapByQlhv,
  formatChatTime,
  parseQlhvKey,
  type ChatExerciseEntry,
  type ChatStudentMapEntry,
  type HvChatboxRow,
} from "@/lib/phong-hoc/hv-chatbox";
import {
  fetchLopHocMeetRow,
  patchLopHocGoogleMeetUrl,
  studentVisibleGoogleMeetUrl,
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
import { classroomGalleryEmoji, fetchClassroomGalleryForLop } from "@/lib/phong-hoc/classroom-gallery";
import ClassroomSignInOverlay from "@/app/_components/ClassroomSignInOverlay";
import StudentAvatarMenu from "@/components/StudentAvatarMenu";
import Link from "next/link";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { Be_Vietnam_Pro, Quicksand } from "next/font/google";
import type { DailyCall } from "@daily-co/daily-js";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
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
const HV_CHAT_POLL_MS = 2000;

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

/** Daily Prebuilt: dùng daily-js + join({ userName }) — iframe thuần không set tên được. */
function isDailyRoomUrl(url: string): boolean {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return h === "daily.co" || h.endsWith(".daily.co");
  } catch {
    return false;
  }
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

const STUDENTS_MOCK: StudentRow[] = [
  {
    hvId: 900001,
    n: "Minh Anh",
    i: "M",
    c: "#4f8ef7",
    st: true,
    sub: true,
    ex: "Bài 3.2",
    exTitle: "Thực hành tông màu",
    exMon: "Trang trí màu",
  },
  {
    hvId: 900002,
    n: "Hà Linh",
    i: "H",
    c: "#f6ad55",
    st: true,
    sub: true,
    ex: "Bài 2.5",
    exTitle: "Phối cảnh không gian",
    exMon: "Hình họa",
  },
  {
    hvId: 900003,
    n: "Tuấn Kiệt",
    i: "T",
    c: "#48bb78",
    st: "late",
    sub: false,
    ex: "Bài 1.8",
    exTitle: "Bài tập chân dung",
    exMon: "Trang trí màu",
  },
  {
    hvId: 900004,
    n: "Phương Vy",
    i: "P",
    c: "#f87171",
    st: true,
    sub: true,
    ex: "Bài 3.1",
    exTitle: "Hoàn thiện đề tài",
    exMon: "Trang trí màu",
  },
  {
    hvId: 900005,
    n: "Khải Minh",
    i: "K",
    c: "#a78bfa",
    st: false,
    sub: false,
    ex: null,
    exTitle: null,
    exMon: null,
  },
];

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
  const [lightbox, setLightbox] = useState<number | null>(null);
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
  const [chatPreviewUrl, setChatPreviewUrl] = useState<string | null>(null);
  const [chatSelectedFile, setChatSelectedFile] = useState<File | null>(null);
  const [chatFullImg, setChatFullImg] = useState<string | null>(null);
  /** Tin chat đang gọi API lưu bài (giáo viên). */
  const [teacherSaveChatBusy, setTeacherSaveChatBusy] = useState<Record<number, boolean>>({});
  /** Tin chat đã lưu thành công vào `hv_bai_hoc_vien` (theo id tin `hv_chatbox`). */
  const [teacherChatSaved, setTeacherChatSaved] = useState<Record<number, boolean>>({});
  /** Thông báo ngắn sau khi lưu (aria-live). */
  const [teacherSaveChatNotice, setTeacherSaveChatNotice] = useState<string | null>(null);
  const [chatDraft, setChatDraft] = useState("");
  const [gFilter, setGFilter] = useState<"mine" | "class">("class");
  const [gExerciseFilter, setGExerciseFilter] = useState<string>("all");
  const [artworks, setArtworks] = useState<Artwork[]>(ARTWORKS_SEED);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [dark, setDark] = useState(false);
  /** `undefined` = chưa fetch; sau đó là giá trị từ `ql_lop_hoc` (cập nhật session cũ thiếu `meeting_room`). */
  const [meetingRoomRefreshed, setMeetingRoomRefreshed] = useState<string | null | undefined>(
    undefined
  );
  /** `undefined` = chưa tải; có session GV thì sau fetch là danh sách `ql_quan_ly_hoc_vien` + hồ sơ. */
  const [classmatesReal, setClassmatesReal] = useState<ClassmateListRow[] | undefined>(undefined);
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

  const dailyMeetContainerRef = useRef<HTMLDivElement>(null);
  const dailyCallFrameRef = useRef<DailyCall | null>(null);
  const gmeetSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Timer id (DOM `window.setTimeout`). */
  const teacherSaveToastTimerRef = useRef<number | null>(null);
  const hvKnownIdsRef = useRef<Set<number>>(new Set());
  const hvLatestCreatedAtRef = useRef<string>("");
  const myQlhvIdRef = useRef<number | null>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  const browserSb = useMemo(() => createBrowserSupabaseClient(), []);

  useEffect(() => {
    try {
      if (localStorage.getItem("phc_dark") === "1") setDark(true);
    } catch {
      /* ignore */
    }
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

  /** `hr_nhan_su.id` của GV — chỉ có khi session là Teacher. Dùng để gọi API ghi
   * tiến độ học viên (bypass RLS + verify chủ nhiệm phía server). */
  const teacherHrIdForDb = useMemo(() => {
    if (storedSession?.userType === "Teacher" && Number.isFinite(storedSession.data.id)) {
      return storedSession.data.id;
    }
    return NaN;
  }, [storedSession]);

  useEffect(() => {
    if (!mounted) return;
    if (!storedSession) {
      setArtworks(ARTWORKS_SEED);
      setGalleryLoading(false);
      return;
    }
    if (!browserSb || !Number.isFinite(lopHocIdForDb)) return;
    let cancelled = false;
    setGalleryLoading(true);
    void (async () => {
      try {
        const rows = await fetchClassroomGalleryForLop(browserSb, lopHocIdForDb);
        if (cancelled) return;
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
        if (!cancelled) setArtworks([]);
      } finally {
        if (!cancelled) setGalleryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mounted, storedSession, browserSb, lopHocIdForDb, d.class_name]);

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
      const photo = m.photo?.trim();
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
      setMeetingRoomRefreshed(undefined);
      setGoogleMeetUrl(null);
      setGoogleMeetSetAt(null);
      setLopDevice(null);
      setGmeetRowReady(false);
      return;
    }
    let cancelled = false;
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setMeetingRoomRefreshed(undefined);
      setGmeetRowReady(true);
      return;
    }
    void (async () => {
      const row = await fetchLopHocMeetRow(supabase, lopHocIdForDb);
      if (cancelled) return;
      setGmeetRowReady(true);
      if (!row) {
        setMeetingRoomRefreshed(undefined);
        setGoogleMeetUrl(null);
        setGoogleMeetSetAt(null);
        setLopDevice(null);
        return;
      }
      setMeetingRoomRefreshed(row.meeting_room);
      setGoogleMeetUrl(row.url_google_meet);
      setGoogleMeetSetAt(row.url_google_meet_set_at);
      setLopDevice(row.device);
      if (storedSession && !cancelled) {
        const v = row.meeting_room;
        const cur =
          storedSession.data.meeting_room != null &&
          String(storedSession.data.meeting_room).trim() !== ""
            ? String(storedSession.data.meeting_room).trim()
            : null;
        if (cur !== v) {
          const next: ClassroomSessionRecord =
            storedSession.userType === "Teacher"
              ? { userType: "Teacher", data: { ...storedSession.data, meeting_room: v } }
              : { userType: "Student", data: { ...storedSession.data, meeting_room: v } };
          saveClassroomSession(next);
          setStoredSession(next);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lopHocIdForDb, storedSession]);

  useEffect(() => {
    if (storedSession?.userType !== "Student") return;
    if (!Number.isFinite(lopHocIdForDb)) return;
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    const tick = () => {
      void fetchLopHocMeetRow(supabase, lopHocIdForDb).then((row) => {
        if (!row) return;
        setGoogleMeetUrl(row.url_google_meet);
        setGoogleMeetSetAt(row.url_google_meet_set_at);
        setMeetingRoomRefreshed(row.meeting_room);
      });
    };
    const id = window.setInterval(tick, 5000);
    return () => window.clearInterval(id);
  }, [storedSession?.userType, lopHocIdForDb]);

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

  const meetingRoomEffective =
    meetingRoomRefreshed !== undefined ? meetingRoomRefreshed : (d.meeting_room ?? null);

  const meetingRoomUrl = useMemo(
    () => normalizeMeetingRoomUrl(meetingRoomEffective),
    [meetingRoomEffective]
  );

  /**
   * Sidebar học viên: chỉ Google Meet (`url_google_meet`), không dùng `meeting_room`
   * (Daily.co nhúng khung chính — GV iPad không share màn được nên Meet tách riêng).
   * Link chỉ hiện trong **cùng ngày lịch VN** sau khi GV lưu (`url_google_meet_set_at`).
   */
  const studentSidebarMeetUrl = useMemo((): string | null => {
    if (storedSession?.userType !== "Student") return null;
    const raw = studentVisibleGoogleMeetUrl(googleMeetUrl, googleMeetSetAt);
    if (!raw?.trim()) return null;
    return normalizeMeetingRoomUrl(raw.trim()) ?? raw.trim();
  }, [googleMeetUrl, googleMeetSetAt, storedSession?.userType]);

  const participantDisplayName = useMemo(() => {
    const n = d.full_name?.trim();
    if (n) return n;
    const e = d.email?.trim();
    if (e) return e;
    return "Thành viên";
  }, [d.full_name, d.email]);

  const liveChatEnabled =
    mounted && storedSession !== null && Number.isFinite(lopHocIdForDb);

  /** GV giờ cũng có tab «Bài giảng» (tab id `third`) — không còn redirect về `lop`. */

  useEffect(() => {
    if (storedSession?.userType === "Student" && Number.isFinite(storedSession.data.qlhv_id)) {
      myQlhvIdRef.current = storedSession.data.qlhv_id;
    } else {
      myQlhvIdRef.current = null;
    }
  }, [storedSession]);

  /** Cookie httpOnly: SSR `/he-thong-bai-tap/*` nhận HV (Phòng học không dùng Supabase Auth). */
  useEffect(() => {
    if (storedSession?.userType !== "Student") return;
    const qlhv_id = storedSession.data.qlhv_id;
    const lop_hoc_id = storedSession.data.lop_hoc_id;
    if (!Number.isFinite(qlhv_id) || !Number.isFinite(lop_hoc_id)) return;
    void fetch("/api/phong-hoc/sync-hv-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qlhv_id, lop_hoc_id }),
      credentials: "include",
    }).catch(() => {});
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
          setHvChatRows(parsed as HvChatboxRow[]);
        }
      }
    } catch {
      /* ignore */
    }

    void apiFetchHvChatboxMessages(lopHocIdForDb)
      .then((rows) => {
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
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setHvChatErr(e instanceof Error ? e.message : "Không tải được chat.");
          setHvChatRows([]);
        }
      });

    const poll = async () => {
      if (cancelled) return;
      const since = hvLatestCreatedAtRef.current;
      if (!since) return;
      let rows: HvChatboxRow[];
      try {
        rows = await apiPollHvChatboxAfter(lopHocIdForDb, since);
      } catch {
        return;
      }
      if (cancelled || !rows.length) return;
      const fresh = rows.filter((r) => !hvKnownIdsRef.current.has(r.id));
      if (!fresh.length) return;
      for (const r of fresh) hvKnownIdsRef.current.add(r.id);
      const lastCa = fresh[fresh.length - 1]?.created_at;
      if (lastCa) hvLatestCreatedAtRef.current = lastCa;
      setHvChatRows((prev) => {
        const merged = [...fresh.reverse(), ...prev].slice(0, 200);
        try {
          localStorage.setItem(chatCacheKey(lopHocIdForDb), JSON.stringify(merged.slice(0, 50)));
        } catch {
          /* ignore */
        }
        return merged;
      });
    };

    const timer = window.setInterval(poll, HV_CHAT_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [browserSb, lopHocIdForDb, storedSession]);

  useLayoutEffect(() => {
    if (!meetingRoomUrl || !isDailyRoomUrl(meetingRoomUrl)) {
      const prev = dailyCallFrameRef.current;
      if (prev) {
        void prev.destroy().finally(() => {
          if (dailyCallFrameRef.current === prev) dailyCallFrameRef.current = null;
        });
      }
      return;
    }

    const container = dailyMeetContainerRef.current;
    if (!container) return;

    let cancelled = false;

    void import("@daily-co/daily-js").then(({ default: DailyIframe }) => {
      if (cancelled || !dailyMeetContainerRef.current) return;

      void (async () => {
        try {
          await dailyCallFrameRef.current?.destroy();
        } catch {
          /* ignore */
        }
        dailyCallFrameRef.current = null;

        if (!dailyMeetContainerRef.current || cancelled) return;

        const frame = DailyIframe.createFrame(dailyMeetContainerRef.current, {
          showLeaveButton: true,
          iframeStyle: {
            position: "absolute",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            border: "0",
          },
        });
        dailyCallFrameRef.current = frame;

        void frame.join({ url: meetingRoomUrl, userName: participantDisplayName }).catch(() => {
          /* lỗi join Daily — người dùng vẫn có thể thử tải lại trang */
        });
      })();
    });

    return () => {
      cancelled = true;
      const frame = dailyCallFrameRef.current;
      if (frame) {
        void frame.destroy().finally(() => {
          if (dailyCallFrameRef.current === frame) dailyCallFrameRef.current = null;
        });
      }
    };
  }, [meetingRoomUrl, participantDisplayName]);

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

  const sendChat = async () => {
    const txt = chatDraft.trim();
    if (!txt && !chatSelectedFile) return;

    if (liveChatEnabled && Number.isFinite(lopHocIdForDb) && storedSession) {
      setHvChatSending(true);
      setHvChatErr(null);
      try {
        let photoUrl: string | null = null;
        if (chatSelectedFile) {
          const fd = new FormData();
          fd.append("file", chatSelectedFile, chatSelectedFile.name || "chat.jpg");
          const up = await fetch("/api/phong-hoc/upload-chat-image", { method: "POST", body: fd });
          const uj = (await up.json()) as { ok?: boolean; url?: string; error?: string };
          if (!up.ok || !uj.ok || typeof uj.url !== "string") {
            throw new Error(uj.error || "Upload ảnh thất bại.");
          }
          photoUrl = uj.url;
        }

        const qlhvIdForInsert =
          storedSession.userType === "Student" && Number.isFinite(storedSession.data.qlhv_id)
            ? storedSession.data.qlhv_id
            : null;

        const row = await apiInsertHvChatboxMessage({
          lopHocId: lopHocIdForDb,
          usertype: storedSession.userType === "Teacher" ? "Teacher" : "Student",
          name: qlhvIdForInsert,
          content: txt.length > 0 ? txt : null,
          photo: photoUrl,
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
        setChatSelectedFile(null);
        if (chatPreviewUrl) URL.revokeObjectURL(chatPreviewUrl);
        setChatPreviewUrl(null);
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
    storedSession?.userType === "Student" && Number.isFinite(storedSession.data.id)
      ? storedSession.data.id
      : null;

  const classFilterLabel = useMemo(() => {
    const raw = (d.class_name ?? "").trim();
    if (!raw) return "Bài học viên lớp";
    const pretty = raw.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
    return `Bài học viên lớp ${pretty}`;
  }, [d.class_name]);

  const filteredGallery = useMemo(() => {
    const source =
      gFilter === "mine"
        ? myStudentId == null
          ? []
          : artworks.filter((a) => a.ownerStudentId != null && a.ownerStudentId === myStudentId)
        : artworks;
    if (gExerciseFilter === "all") return source;
    const exId = Number(gExerciseFilter);
    if (!Number.isFinite(exId) || exId <= 0) return source;
    return source.filter((a) => a.exerciseId != null && a.exerciseId === exId);
  }, [artworks, gFilter, myStudentId, gExerciseFilter]);

  const galleryExerciseOptions = useMemo(() => {
    const m = new Map<number, { id: number; order: number | null; label: string }>();
    for (const a of artworks) {
      if (a.exerciseId == null || a.exerciseId <= 0) continue;
      if (m.has(a.exerciseId)) continue;
      const order = a.exerciseOrder;
      const title = a.exerciseTitle?.trim() ?? "";
      const num = order != null && order > 0 ? `Bài ${order}` : null;
      let label: string;
      if (num && title) label = `${num} — ${title}`;
      else if (num) label = num;
      else if (title) label = title;
      else label = `Bài #${a.exerciseId}`;
      m.set(a.exerciseId, { id: a.exerciseId, order, label });
    }
    return [...m.values()].sort((a, b) => {
      const oa = a.order ?? Number.MAX_SAFE_INTEGER;
      const ob = b.order ?? Number.MAX_SAFE_INTEGER;
      if (oa !== ob) return oa - ob;
      return a.id - b.id;
    });
  }, [artworks]);

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
              <div className={cx("topbar-title", fontTitle.className)}>Phòng học online</div>
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
            <div className={cx("topbar-title", fontTitle.className)}>Phòng học online</div>
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
            {meetingRoomUrl ? (
              <motion.div
                layout
                className="canvas-ph canvas-ph--meet"
                transition={PHC_SIDEBAR_TWEEN}
              >
                {isDailyRoomUrl(meetingRoomUrl) ? (
                  <div ref={dailyMeetContainerRef} className="daily-meet-frame-root" />
                ) : (
                  <iframe
                    src={meetingRoomUrl}
                    title="Phòng họp — meeting_room"
                    allow="camera; microphone; fullscreen; display-capture; autoplay"
                    allowFullScreen
                  />
                )}
              </motion.div>
            ) : (
              <motion.div layout className="canvas-ph" transition={PHC_SIDEBAR_TWEEN}>
                <span className="ico">🎨</span>
                <p>Phòng học trực tuyến</p>
                <small>
                  Chưa có liên kết phòng họp trên hệ thống. Admin cập nhật cột{" "}
                  <code>ql_lop_hoc.meeting_room</code> (URL Meet / Daily / …).
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
                            <div className="ss-sub">
                              {d.email} · {d.class_name}
                            </div>
                          </div>
                        </div>
                        <div className="ss-divider" />
                        <div className="ss-stat-box" style={{ marginBottom: 10 }}>
                          <span className="ss-stat-lbl">Học viên trong lớp</span>
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
                        {teacherClassmates.map((s) => (
                          <div key={s.hvId} className="online-row">
                            <div className="o-av" style={{ background: s.c }}>
                              {s.i}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="o-name">{s.n}</div>
                              <div className="o-ex">{formatClassmateProgressLine(s)}</div>
                            </div>
                            <div
                              className={cx(
                                "o-dot",
                                s.st === true ? "dg" : s.st === "late" ? "dy" : "dr"
                              )}
                            />
                          </div>
                        ))}
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
                        const hasPhoto = Boolean(m.photo?.trim());
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
                              </div>
                              {hasPhoto ? (
                                <div className="chat-photo-wrap">
                                  <button
                                    type="button"
                                    className="chat-photo-btn"
                                    onClick={() => setChatFullImg(m.photo!.trim())}
                                    aria-label="Phóng to ảnh"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={m.photo!.trim()} alt="" className="chat-cphoto" />
                                  </button>
                                  {isTeacher &&
                                  !isGV &&
                                  qlhvKey != null &&
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
                {liveChatEnabled && chatPreviewUrl ? (
                  <div className="chat-preview-row">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={chatPreviewUrl} alt="" className="chat-preview-thumb" />
                    <button
                      type="button"
                      className="chat-preview-x"
                      onClick={() => {
                        setChatSelectedFile(null);
                        if (chatPreviewUrl) URL.revokeObjectURL(chatPreviewUrl);
                        setChatPreviewUrl(null);
                        if (chatFileInputRef.current) chatFileInputRef.current.value = "";
                      }}
                      aria-label="Bỏ ảnh"
                    >
                      ×
                    </button>
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
                    className="phc-sr-only"
                    id="phc-chat-file"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setChatSelectedFile(f);
                      setChatPreviewUrl((prev) => {
                        if (prev) URL.revokeObjectURL(prev);
                        return URL.createObjectURL(f);
                      });
                    }}
                  />
                  <label
                    htmlFor={liveChatEnabled ? "phc-chat-file" : undefined}
                    className={cx("chat-img-lbl", !liveChatEnabled && "chat-img-lbl--off")}
                    title={
                      liveChatEnabled ? "Đính kèm ảnh" : "Đăng nhập lớp để gửi ảnh và tin thật"
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
                    disabled={hvChatSending || (!chatDraft.trim() && !chatSelectedFile)}
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
                <div className="gallery-grid">
                  {galleryLoading ? (
                    <div className="gallery-grid-loading" style={{ gridColumn: "1 / -1" }}>
                      Đang tải tác phẩm…
                    </div>
                  ) : filteredGallery.length === 0 ? (
                    <div className="gallery-grid-empty" style={{ gridColumn: "1 / -1" }}>
                      {gFilter === "mine"
                        ? "Bạn chưa có bài hoàn thiện trong lớp này."
                        : gExerciseFilter !== "all"
                          ? "Chưa có bài hoàn thiện cho mục bài đã chọn."
                          : "Chưa có bài hoàn thiện trong lớp này."}
                    </div>
                  ) : (
                  filteredGallery.map((a, i) => {
                    const globalIdx = artworks.indexOf(a);
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
                        onClick={() => setLightbox(globalIdx)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setLightbox(globalIdx);
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
                        <div className="ginfo">
                          <div className="gname">{a.n}</div>
                        </div>
                      </div>
                    );
                  })
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
                    </>
                  ) : (
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

      {lightbox != null && artworks[lightbox] ? (
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
                artworks[lightbox]!.photo?.trim()
                  ? (cfImageForLightbox(artworks[lightbox]!.photo!.trim()) ??
                    artworks[lightbox]!.photo!.trim())
                  : `https://placehold.co/600x450/FFF0EC/EE5CA2?text=${encodeURIComponent(artworks[lightbox]!.n)}`
              }
              alt={artworks[lightbox]!.n}
            />
            <div className="lb-meta">
              <span className="lb-name">{artworks[lightbox]!.n}</span>
              <span className="lb-chip">{artworks[lightbox]!.cls}</span>
              {artworks[lightbox]!.mau ? <span className="lb-mau">✦ Bài mẫu</span> : null}
              {artworks[lightbox]!.score != null ? (
                <span className="lb-score">★ {artworks[lightbox]!.score}</span>
              ) : null}
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
