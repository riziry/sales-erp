import Link from "next/link";
export default function NotFound() {
  return (
    <main className="error-page">
      <h1>Document not found.</h1>
      <p>Check the link or return to the quotation list.</p>
      <Link href="/quotation" className="button">
        All quotations
      </Link>
    </main>
  );
}
