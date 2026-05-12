import SchemaOrg from "@/components/seo/SchemaOrg";
import {
  getHomeBreadcrumbListJsonLd,
  getHomeWebPageJsonLd,
  getHomeWebSiteJsonLd,
} from "@/lib/seo/site-jsonld";

/** Ba JSON-LD tách script: WebSite (+ SearchAction), WebPage, BreadcrumbList — trang chủ. */
export default function HomePageJsonLd() {
  return (
    <>
      <SchemaOrg schema={getHomeWebSiteJsonLd()} />
      <SchemaOrg schema={getHomeWebPageJsonLd()} />
      <SchemaOrg schema={getHomeBreadcrumbListJsonLd()} />
    </>
  );
}
