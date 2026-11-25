export default function Placeholder({ title, body }: { title: string; body: string }) {
  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-muted">{body}</p>
      <div className="card mt-6 grid h-48 place-items-center border-dashed text-sm text-muted">Coming in a later milestone</div>
    </section>
  );
}
