export default function Dashboard() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Good morning</h1>
        <p className="text-muted mt-1 font-mono text-sm">{today}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-sm font-medium text-muted mb-3">Active Goals</h2>
          <p className="text-2xl font-bold">0</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-sm font-medium text-muted mb-3">
            Pending Tasks
          </h2>
          <p className="text-2xl font-bold">0</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-sm font-medium text-muted mb-3">
            Today&apos;s Blocks
          </h2>
          <p className="text-2xl font-bold">0</p>
        </div>
      </div>

      <div className="mt-8">
        <button className="bg-accent hover:bg-accent/90 text-white px-6 py-3 rounded-lg font-medium transition-colors">
          ✦ Optimize My Day
        </button>
      </div>
    </div>
  );
}
