import type { Metadata } from "next";
import ClassroomClient from "./ClassroomClient";

export const metadata: Metadata = {
  title: "Phòng học online — Sine Art",
  description: "Không gian học trực tuyến Sine Art — video, chat và tài nguyên lớp.",
};

export default function PhongHocPage() {
  return <ClassroomClient />;
}
