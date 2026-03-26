"use client";

const danceStyles = [
  { name: "Cyber Hip-Hop", courses: 8, image: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400" },
  { name: "Neon Breakdance", courses: 12, image: "https://images.unsplash.com/photo-1547153760-18fc86324498?w=400" },
  { name: "Liquid Pop", courses: 5, image: "https://images.unsplash.com/photo-1524593166156-312f362cada0?w=400" },
];

export default function DashLibraryPage() {
  return (
    <div className="animate-fade-in">
      <header className="mb-8">
        <h1 className="text-gradient-red text-5xl font-extrabold tracking-tight">Dance Library</h1>
        <p className="text-zinc-400 mt-2 text-lg">Explore new styles and masterclasses.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {danceStyles.map((style) => (
          <div
            key={style.name}
            className="min-h-[220px] rounded-2xl overflow-hidden relative flex flex-col justify-end p-6 dash-glass dash-card cursor-pointer group animate-slide-up"
            style={{
              background: `linear-gradient(to top, rgba(0,0,0,0.85), transparent), url('${style.image}') center/cover`,
            }}
          >
              <div className="absolute inset-0 bg-gradient-to-br from-nred-700/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <div className="relative z-10">
              <h3 className="text-xl font-bold text-white">{style.name}</h3>
              <p className="text-xs text-zinc-400 mt-1">{style.courses} Courses</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
