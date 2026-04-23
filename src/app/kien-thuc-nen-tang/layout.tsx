import { Lora, Montserrat } from "next/font/google";

const montserrat = Montserrat({
  subsets: ["latin", "vietnamese"],
  variable: "--font-montserrat",
  weight: ["500", "600", "700", "800", "900"],
});

/**
 * Lora — serif editorial magazine, full hỗ trợ Vietnamese (NFC + NFD
 * combining marks). Dùng làm font CHÍNH cho `.ktn-lib` thay cho Georgia
 * (Georgia hỏng diacritics trên Windows khi content là NFD).
 */
const lora = Lora({
  subsets: ["latin", "vietnamese"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-lora",
  display: "swap",
});

export default function KienThucNenTangLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={`${montserrat.variable} ${lora.variable}`}>{children}</div>
  );
}
