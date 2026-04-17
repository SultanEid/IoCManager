export default function ProtectedLoading() {
  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <article key={index} className="surface space-y-3 p-5">
            <div className="shimmer h-4 w-2/5 rounded-md" />
            <div className="shimmer h-10 w-2/3 rounded-md" />
            <div className="shimmer h-4 w-4/5 rounded-md" />
          </article>
        ))}
      </section>
      <section className="surface p-5">
        <div className="shimmer h-64 rounded-md" />
      </section>
      <section className="surface p-5">
        <div className="shimmer h-72 rounded-md" />
      </section>
    </div>
  )
}
