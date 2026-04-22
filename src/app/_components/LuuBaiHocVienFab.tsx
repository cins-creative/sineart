"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, Check, ChevronLeft, Save, Sparkles, Upload, X } from "lucide-react";
import {
  CLASSROOM_SESSION_CHANGED_EVENT,
  CLASSROOM_SESSION_STORAGE_KEY,
  parseClassroomSession,
  type ClassroomStudentSessionData,
} from "@/lib/phong-hoc/classroom-session";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import "./LuuBaiHocVienFab.css";

type ClassOption = {
  id: number;
  name: string;
  monHocId: number | null;
  monHocTen: string | null;
};

type ExerciseOption = {
  id: number;
  baiSo: string;
  tenBai: string;
};

type UploadState = "idle" | "uploading" | "done" | "error";

function readStudentSession(): ClassroomStudentSessionData | null {
  if (typeof window === "undefined") return null;
  const parsed = parseClassroomSession(localStorage.getItem(CLASSROOM_SESSION_STORAGE_KEY));
  if (!parsed || parsed.userType !== "Student") return null;
  return parsed.data;
}

/**
 * FAB "Lưu bài" — chỉ hiển thị khi học viên đã sign-in (`sine_art_session`).
 * Học viên chụp / tải ảnh → upload Cloudflare Images → chọn lớp (chỉ lớp đang ghi danh)
 * → chọn bài tập (theo môn của lớp) → `POST /api/hoc-vien/save-bai-hoc-vien` để lưu
 * `hv_bai_hoc_vien` với `status = "Chờ xác nhận"`. Tên học viên tự động lấy từ session.
 */
export default function LuuBaiHocVienFab(): React.ReactElement | null {
  const [student, setStudent] = useState<ClassroomStudentSessionData | null>(null);
  const [mounted, setMounted] = useState(false);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [uploadErr, setUploadErr] = useState("");
  const [uploadPct, setUploadPct] = useState(0);

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [classesErr, setClassesErr] = useState("");
  const [classId, setClassId] = useState<number | null>(null);

  const [exercises, setExercises] = useState<ExerciseOption[]>([]);
  const [exercisesLoading, setExercisesLoading] = useState(false);
  const [exerciseId, setExerciseId] = useState<number | null>(null);

  const [baiMau, setBaiMau] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveErr, setSaveErr] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMounted(true);
    const sync = () => setStudent(readStudentSession());
    sync();
    const onStorage = (e: StorageEvent) => {
      if (e.key === CLASSROOM_SESSION_STORAGE_KEY || e.key === null) sync();
    };
    window.addEventListener(CLASSROOM_SESSION_CHANGED_EVENT, sync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CLASSROOM_SESSION_CHANGED_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const loadClasses = useCallback(async () => {
    if (!student?.id) return;
    setClassesLoading(true);
    setClassesErr("");
    try {
      const sb = createBrowserSupabaseClient();
      if (!sb) throw new Error("Chưa cấu hình Supabase.");

      const { data: enRows, error: enErr } = await sb
        .from("ql_quan_ly_hoc_vien")
        .select("lop_hoc")
        .eq("hoc_vien_id", student.id);
      if (enErr) throw enErr;

      const lopIds = Array.from(
        new Set(
          (enRows ?? [])
            .map((r) => Number((r as { lop_hoc?: unknown }).lop_hoc))
            .filter((v) => Number.isFinite(v) && v > 0),
        ),
      );
      if (lopIds.length === 0) {
        setClasses([]);
        return;
      }

      const { data: clsRows, error: clsErr } = await sb
        .from("ql_lop_hoc")
        .select("id, class_name, class_full_name, mon_hoc")
        .in("id", lopIds)
        .order("class_name", { ascending: true });
      if (clsErr) throw clsErr;

      const monHocIds = Array.from(
        new Set(
          (clsRows ?? [])
            .map((r) => Number((r as { mon_hoc?: unknown }).mon_hoc))
            .filter((v) => Number.isFinite(v) && v > 0),
        ),
      );
      const monNameById = new Map<number, string>();
      if (monHocIds.length > 0) {
        const { data: monRows } = await sb
          .from("ql_mon_hoc")
          .select("id, ten_mon_hoc")
          .in("id", monHocIds);
        (monRows ?? []).forEach((r) => {
          const id = Number((r as { id?: unknown }).id);
          const name = String((r as { ten_mon_hoc?: unknown }).ten_mon_hoc ?? "").trim();
          if (Number.isFinite(id) && name) monNameById.set(id, name);
        });
      }

      const mapped: ClassOption[] = (clsRows ?? []).map((r) => {
        const row = r as {
          id: number;
          class_name?: string | null;
          class_full_name?: string | null;
          mon_hoc?: number | null;
        };
        const mh = row.mon_hoc != null && Number.isFinite(Number(row.mon_hoc)) ? Number(row.mon_hoc) : null;
        return {
          id: Number(row.id),
          name:
            String(row.class_full_name || row.class_name || "").trim() || `Lớp #${row.id}`,
          monHocId: mh,
          monHocTen: mh != null ? (monNameById.get(mh) ?? null) : null,
        };
      });
      setClasses(mapped);
    } catch (e) {
      setClassesErr((e as Error).message || "Không tải được lớp.");
    } finally {
      setClassesLoading(false);
    }
  }, [student?.id]);

  useEffect(() => {
    if (!student?.id) {
      setClasses([]);
      setClassId(null);
      return;
    }
    void loadClasses();
  }, [student?.id, loadClasses]);

  useEffect(() => {
    if (!classId) {
      setExercises([]);
      setExerciseId(null);
      return;
    }
    const monHocId = classes.find((c) => c.id === classId)?.monHocId;
    if (!monHocId) {
      setExercises([]);
      setExerciseId(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setExercisesLoading(true);
      try {
        const sb = createBrowserSupabaseClient();
        if (!sb) throw new Error("Chưa cấu hình Supabase.");
        const { data, error } = await sb
          .from("hv_he_thong_bai_tap")
          .select("id, ten_bai_tap, bai_so")
          .eq("mon_hoc", monHocId)
          .order("bai_so", { ascending: true, nullsFirst: false });
        if (error) throw error;
        if (cancelled) return;
        const mapped: ExerciseOption[] = (data ?? []).map((r) => {
          const row = r as { id: number; ten_bai_tap?: string | null; bai_so?: string | number | null };
          return {
            id: Number(row.id),
            baiSo: row.bai_so != null ? String(row.bai_so).trim() : "",
            tenBai: String(row.ten_bai_tap ?? "").trim(),
          };
        });
        setExercises(mapped);
      } catch {
        if (!cancelled) setExercises([]);
      } finally {
        if (!cancelled) setExercisesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [classId, classes]);

  /** Gợi ý lớp mặc định từ session — thường là lớp gần nhất học viên mở Phòng học. */
  useEffect(() => {
    if (classId != null) return;
    const defaultLop = student?.lop_hoc_id;
    if (!defaultLop) return;
    if (classes.some((c) => c.id === defaultLop)) {
      setClassId(defaultLop);
    }
  }, [classes, classId, student?.lop_hoc_id]);

  /** Gợi ý bài tập mặc định từ `ql_quan_ly_hoc_vien.tien_do_hoc` (ghi trong session). */
  useEffect(() => {
    if (exerciseId != null) return;
    const defaultEx = student?.tien_do_hoc;
    if (!defaultEx) return;
    if (exercises.some((e) => e.id === defaultEx)) {
      setExerciseId(defaultEx);
    }
  }, [exercises, exerciseId, student?.tien_do_hoc]);

  const resetAll = useCallback(() => {
    setImgPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setUploadState("idle");
    setUploadedUrl("");
    setUploadErr("");
    setUploadPct(0);
    setBaiMau(false);
    setSaveErr("");
    setSaved(false);
    setSaving(false);
    setFormOpen(false);
    setExerciseId(null);
    /** Không reset `classId` — giữ lớp mặc định user đã chọn cho lần lưu tiếp. */
  }, []);

  const handleFile = async (file: File) => {
    setImgPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setUploadState("uploading");
    setUploadPct(20);
    setUploadedUrl("");
    setUploadErr("");
    setSaveErr("");
    setSaved(false);
    setFormOpen(true);

    try {
      setUploadPct(45);
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/phong-hoc/upload-chat-image", {
        method: "POST",
        body: fd,
      });
      const j = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !j.ok || !j.url) {
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      setUploadedUrl(j.url);
      setUploadState("done");
      setUploadPct(100);
    } catch (e) {
      setUploadState("error");
      setUploadErr((e as Error).message || "Upload thất bại.");
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void handleFile(f);
    e.target.value = "";
  };

  const handleSave = async () => {
    if (saving || !student) return;
    if (uploadState !== "done" || !uploadedUrl) {
      setSaveErr("Ảnh chưa upload xong.");
      return;
    }
    if (!classId) {
      setSaveErr("Vui lòng chọn lớp học.");
      return;
    }
    setSaveErr("");
    setSaving(true);
    try {
      const res = await fetch("/api/hoc-vien/save-bai-hoc-vien", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          hocVienId: student.id,
          classId,
          exerciseId,
          photoUrl: uploadedUrl,
          baiMau,
        }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) throw new Error(j.error ?? `HTTP ${res.status}`);
      setSaved(true);
      window.setTimeout(() => {
        resetAll();
      }, 1500);
    } catch (e) {
      setSaveErr((e as Error).message || "Không lưu được bài.");
      setSaving(false);
    }
  };

  if (!mounted || !student) return null;

  const hasClasses = classes.length > 0;
  const exDisabled = !classId || exercises.length === 0;

  return (
    <div className="luubai-root">
      <AnimatePresence>
        {!formOpen && (
          <motion.button
            key="fab"
            type="button"
            aria-label="Lưu bài"
            title="Lưu bài"
            className="luubai-fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => setPickerOpen(true)}
          >
            <Camera size={22} strokeWidth={2} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pickerOpen && (
          <>
            <motion.div
              key="luubai-backdrop"
              className="luubai-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setPickerOpen(false)}
            />
            <motion.div
              key="luubai-sheet"
              className="luubai-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 30 }}
              role="dialog"
              aria-modal
              aria-labelledby="luubai-sheet-title"
            >
              <div className="luubai-sheet-grip" />
              <button
                type="button"
                className="luubai-sheet-close"
                aria-label="Đóng"
                onClick={() => setPickerOpen(false)}
              >
                <X size={16} />
              </button>
              <div className="luubai-sheet-head">
                <p className="luubai-eyebrow">Sine Art</p>
                <h2 id="luubai-sheet-title" className="luubai-h">
                  Lưu bài học viên
                </h2>
                <p className="luubai-sub">
                  Học viên: <strong>{student.full_name}</strong>
                </p>
              </div>
              <div className="luubai-sheet-grid">
                <button
                  type="button"
                  className="luubai-opt"
                  onClick={() => {
                    setPickerOpen(false);
                    cameraInputRef.current?.click();
                  }}
                >
                  <span className="luubai-opt-ico luubai-opt-ico--accent">
                    <Camera size={20} strokeWidth={2} />
                  </span>
                  <span className="luubai-opt-label">Chụp ảnh</span>
                  <span className="luubai-opt-sub">Camera gốc</span>
                </button>
                <button
                  type="button"
                  className="luubai-opt"
                  onClick={() => {
                    setPickerOpen(false);
                    fileInputRef.current?.click();
                  }}
                >
                  <span className="luubai-opt-ico luubai-opt-ico--purple">
                    <Upload size={20} strokeWidth={2} />
                  </span>
                  <span className="luubai-opt-label">Tải ảnh lên</span>
                  <span className="luubai-opt-sub">JPG, PNG, WEBP</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {formOpen && (
          <motion.div
            key="luubai-form"
            className="luubai-form"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            role="dialog"
            aria-modal
            aria-labelledby="luubai-form-title"
          >
            <div className="luubai-form-head">
              <button
                type="button"
                className="luubai-back"
                onClick={resetAll}
                aria-label="Quay lại"
              >
                <ChevronLeft size={16} />
              </button>
              <div>
                <p className="luubai-eyebrow">Sine Art</p>
                <h2 id="luubai-form-title" className="luubai-h2">
                  Lưu bài học viên
                </h2>
              </div>
            </div>

            <div className="luubai-form-body">
              <div className="luubai-who">
                {student.hv_avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={student.hv_avatar} alt="" className="luubai-who-av" />
                ) : (
                  <div className="luubai-who-av luubai-who-av--blank" aria-hidden />
                )}
                <div className="luubai-who-info">
                  <span className="luubai-who-label">Học viên</span>
                  <strong className="luubai-who-name">{student.full_name}</strong>
                </div>
              </div>

              <div className={`luubai-preview luubai-preview--${uploadState}`}>
                {imgPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imgPreview} alt="Xem trước" />
                ) : null}
                {uploadState === "uploading" && (
                  <div className="luubai-uploading">
                    <span className="luubai-spin" />
                    <p>Đang upload lên Cloudflare… {uploadPct}%</p>
                    <div className="luubai-bar">
                      <div className="luubai-bar-fill" style={{ width: `${uploadPct}%` }} />
                    </div>
                  </div>
                )}
                <div className="luubai-status">
                  <span className="luubai-status-dot" />
                  <span className="luubai-status-text">
                    {uploadState === "done"
                      ? "Upload thành công · Cloudflare Images"
                      : uploadState === "error"
                        ? uploadErr || "Upload thất bại"
                        : uploadState === "uploading"
                          ? "Đang tải lên Cloudflare Images…"
                          : "Chờ upload"}
                  </span>
                  <button
                    type="button"
                    className="luubai-status-swap"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Đổi ảnh
                  </button>
                </div>
              </div>

              <div className="luubai-field">
                <label className="luubai-lbl" htmlFor="luubai-class">
                  Lớp học đang học
                </label>
                <select
                  id="luubai-class"
                  className="luubai-select"
                  value={classId ?? ""}
                  onChange={(e) => setClassId(e.target.value ? Number(e.target.value) : null)}
                  disabled={classesLoading}
                >
                  <option value="">
                    {classesLoading
                      ? "Đang tải…"
                      : hasClasses
                        ? "— Chọn lớp —"
                        : "Chưa có lớp đang học"}
                  </option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.monHocTen ? ` · ${c.monHocTen}` : ""}
                    </option>
                  ))}
                </select>
                {classesErr && <p className="luubai-field-err">{classesErr}</p>}
              </div>

              <div className="luubai-field">
                <label className="luubai-lbl" htmlFor="luubai-ex">
                  Bài tập (tuỳ chọn)
                </label>
                <select
                  id="luubai-ex"
                  className="luubai-select"
                  value={exerciseId ?? ""}
                  onChange={(e) => setExerciseId(e.target.value ? Number(e.target.value) : null)}
                  disabled={exDisabled || exercisesLoading}
                >
                  <option value="">
                    {!classId
                      ? "Chọn lớp trước"
                      : exercisesLoading
                        ? "Đang tải…"
                        : exercises.length === 0
                          ? "Chưa có bài tập cho môn này"
                          : "— Không gán bài tập —"}
                  </option>
                  {exercises.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.baiSo ? `Bài ${ex.baiSo} – ` : ""}
                      {ex.tenBai || "(chưa đặt tên)"}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className={`luubai-baimau ${baiMau ? "is-on" : ""}`}
                onClick={() => setBaiMau((v) => !v)}
                aria-pressed={baiMau}
              >
                <span className="luubai-baimau-box" aria-hidden>
                  {baiMau && <Check size={12} strokeWidth={3} />}
                </span>
                <Sparkles size={14} strokeWidth={2} />
                <span>Đánh dấu là bài mẫu</span>
              </button>

              {saveErr && <div className="luubai-err">{saveErr}</div>}
            </div>

            <div className="luubai-form-foot">
              <button type="button" className="luubai-btn luubai-btn--ghost" onClick={resetAll}>
                Huỷ
              </button>
              <motion.button
                type="button"
                className="luubai-btn luubai-btn--primary"
                onClick={handleSave}
                disabled={saving || uploadState !== "done" || !classId}
                whileHover={{ scale: saving ? 1 : 1.02 }}
                whileTap={{ scale: saving ? 1 : 0.98 }}
                data-state={saved ? "saved" : saving ? "saving" : "idle"}
              >
                {saved ? (
                  <>
                    <Check size={16} strokeWidth={3} /> Đã lưu!
                  </>
                ) : saving ? (
                  <>
                    <span className="luubai-spin luubai-spin--sm" /> Đang lưu…
                  </>
                ) : (
                  <>
                    <Save size={16} strokeWidth={2.5} /> Lưu bài
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="luubai-hidden"
        onChange={handleFileInput}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="luubai-hidden"
        onChange={handleFileInput}
      />
    </div>
  );
}
