/** JSON-LD `<script type="application/ld+json">` — dùng chung SEO, không đổi UI. */
export default function SchemaOrg({ schema }: { schema: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
