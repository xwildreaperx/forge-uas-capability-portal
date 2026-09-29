import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="standalone-message">
      <p className="eyebrow">RECORD NOT FOUND</p>
      <h1>This FORGE record could not be found.</h1>
      <p>
        The link may be incorrect, or the record may not be available in the
        current dataset. Historical superseded records remain available when
        their tracking ID still exists.
      </p>
      <Link className="create" href="/">Return to the FORGE portal</Link>
    </main>
  );
}
