import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="max-w-xl text-center">
          <h1 className="text-2xl font-bold mb-4">Admin Access</h1>
          <p className="mb-4">Please log in to continue.</p>
          <Link href="/auth?redirect=%2Fadmin" className="text-blue-400 hover:underline">
            Admin Sign In
          </Link>
        </div>
      </main>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="max-w-xl text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="mb-4">You do not have permission to view this admin area.</p>
          <Link href="/learn/feed" className="text-blue-400 hover:underline">
            Back to platform
          </Link>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
