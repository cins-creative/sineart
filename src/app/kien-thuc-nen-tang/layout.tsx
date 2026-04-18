import { Montserrat } from "next/font/google";

const montserrat = Montserrat({
  subsets: ["latin", "vietnamese"],
  variable: "--font-montserrat",
  weight: ["500", "600", "700", "800", "900"],
});

export default function KienThucNenTangLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className={montserrat.variable}>{children}</div>;
}
