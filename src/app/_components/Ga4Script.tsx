import Script from "next/script";

import { getGa4MeasurementId } from "@/lib/analytics/ga4-config";

/** GA4 pageview — bổ sung cho Vercel Analytics; cần `NEXT_PUBLIC_GA4_MEASUREMENT_ID`. */
export default function Ga4Script() {
  const id = getGa4MeasurementId();
  if (!id) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}',{send_page_view:true});`}
      </Script>
    </>
  );
}
