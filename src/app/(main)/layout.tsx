import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import GlobalDownloadButton from "@/components/layout/GlobalDownloadButton";
import MobileTopBar from "@/components/layout/MobileTopBar";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerSupabase();
  let navbarUser: { id: string; full_name: string; avatar_url: string | null; role: string } | null = null;

  const { data: userData } = await supabase.auth.getUser();
  if (userData.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, role")
      .eq("id", userData.user.id)
      .maybeSingle();

    navbarUser = {
      id: userData.user.id,
      full_name:
        profile?.full_name ||
        (userData.user.user_metadata?.full_name as string | undefined) ||
        (userData.user.email?.split("@")[0] ?? "Dancer"),
      avatar_url:
        profile?.avatar_url ||
        (userData.user.user_metadata?.avatar_url as string | undefined) ||
        null,
      role: profile?.role || "student",
    };
  }

  return (
    <div className="min-h-screen flex flex-col app-shell">
      <div className="hidden md:block">
        <Navbar user={navbarUser} />
      </div>

      <MobileTopBar initial={navbarUser?.full_name?.[0] ?? "N"} />

      <main className="flex-1 pb-24 md:pb-0">
        {children}
      </main>

      <GlobalDownloadButton />

      <div className="hidden md:block">
        <Footer />
      </div>
      <MobileNav />
    </div>
  );
}
