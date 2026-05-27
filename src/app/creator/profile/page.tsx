"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Card from "@/components/ui/Card";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

const DANCE_STYLES = ["Bollywood", "Hip Hop", "Kathak", "Bhangra", "Contemporary", "Salsa", "Bharatanatyam", "Zumba", "Freestyle"];
const EXP_LEVELS = [
	{ value: "emerging", label: "Emerging Creator", desc: "Just getting started" },
	{ value: "established", label: "Established Creator", desc: "Regular teaching experience" },
	{ value: "master", label: "Master Choreographer", desc: "Professional choreographer" },
] as const;

export default function CreatorProfilePage() {
	const [displayName, setDisplayName] = useState("");
	const [bio, setBio] = useState("");
	const [philosophy, setPhilosophy] = useState("");
	const [expLevel, setExpLevel] = useState("emerging");
	const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
	const [instagram, setInstagram] = useState("");
	const [youtube, setYoutube] = useState("");
	const [tiktok, setTiktok] = useState("");
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		let mounted = true;

		async function loadProfile() {
			try {
				const response = await fetch("/api/choreographer/profile", { cache: "no-store" });
				const payload = await response.json().catch(() => ({}));
				if (!mounted || !response.ok) return;

				if (payload?.profile) {
					setDisplayName(payload.profile.displayName || "");
					setBio(payload.profile.bio || "");
					setPhilosophy(payload.profile.philosophy || "");
					setExpLevel(payload.profile.expLevel || "emerging");
					setSelectedStyles(Array.isArray(payload.profile.selectedStyles) ? payload.profile.selectedStyles : []);
					setInstagram(payload.profile.instagram || "");
					setYoutube(payload.profile.youtube || "");
					setTiktok(payload.profile.tiktok || "");
				}
			} catch {
				if (mounted) setError("Could not load your profile right now.");
			} finally {
				if (mounted) setLoading(false);
			}
		}

		void loadProfile();

		return () => {
			mounted = false;
		};
	}, []);

	const toggleStyle = (style: string) => {
		setSelectedStyles((prev) => prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]);
	};

	const handleSave = async () => {
		setSaving(true);
		setError("");

		try {
			const response = await fetch("/api/choreographer/profile", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					displayName,
					bio,
					philosophy,
					expLevel,
					selectedStyles,
					instagram,
					youtube,
					tiktok,
				}),
			});

			const payload = await response.json().catch(() => ({}));
			if (!response.ok) {
				setError(payload?.error || "Unable to save profile");
				return;
			}

			setSaved(true);
			setTimeout(() => setSaved(false), 3000);
		} catch {
			setError("Unable to save profile");
		} finally {
			setSaving(false);
		}
	};

	return (
		<motion.div initial="hidden" animate="visible" variants={stagger}>
			<motion.div variants={fadeUp} className="mb-6">
				<h1 className="font-display text-2xl sm:text-3xl font-bold text-white">Creator Profile</h1>
				<p className="text-zinc-400 mt-1 text-sm">Build your professional presence on Nachly</p>
			</motion.div>

			{loading ? (
				<motion.div variants={fadeUp} className="mb-6 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">
					Loading profile...
				</motion.div>
			) : null}

			{error ? (
				<motion.div variants={fadeUp} className="mb-6 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
					{error}
				</motion.div>
			) : null}

			<motion.div variants={fadeUp} className="mb-6">
				<Card className="!p-0 overflow-hidden">
					<div className="h-32 bg-gradient-to-r from-[#344400] via-[#556d00] to-[#D88B80] relative">
						<div className="absolute inset-0 bg-[url('/brand-logo.svg')] bg-center bg-no-repeat opacity-10" style={{ backgroundSize: "60px" }} />
					</div>
					<div className="px-6 pb-6 -mt-10 relative">
						<div className="flex items-end gap-4">
							<div className="h-20 w-20 rounded-2xl border-4 border-black bg-zinc-800 flex items-center justify-center shrink-0">
								<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5"><circle cx="12" cy="8" r="4" /><path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" /></svg>
							</div>
							<div className="pb-1">
								<div className="flex items-center gap-2">
									<p className="text-lg font-bold text-white">{displayName || "Your Name"}</p>
									<span className="inline-flex items-center gap-1 rounded-full bg-[#F3B2AB]/15 px-2 py-0.5 text-[10px] font-bold text-[#F3B2AB]">
										<svg width="10" height="10" viewBox="0 0 24 24" fill="#F3B2AB"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
										Verified
									</span>
								</div>
								<p className="text-xs text-zinc-500">{selectedStyles.join(" · ") || "Dance styles"}</p>
							</div>
						</div>
						<p className="mt-3 text-sm text-zinc-400 line-clamp-2">{bio || "Your bio will appear here..."}</p>
					</div>
				</Card>
			</motion.div>

			<motion.div variants={fadeUp} className="mb-6">
				<Card>
					<h3 className="font-display font-bold text-white mb-4">Basic Information</h3>
					<div className="space-y-4">
						<div>
							<label className="text-xs font-medium text-zinc-400 mb-1.5 block">Display Name</label>
							<input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="How learners will see you" className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#F3B2AB]/40 transition" />
						</div>
						<div>
							<label className="text-xs font-medium text-zinc-400 mb-1.5 block">Bio</label>
							<textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Tell learners about yourself and your dance journey..." className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#F3B2AB]/40 transition resize-none" />
							<p className="text-[10px] text-zinc-600 mt-1">{bio.length}/300 characters</p>
						</div>
						<div>
							<label className="text-xs font-medium text-zinc-400 mb-1.5 block">Teaching Philosophy</label>
							<textarea value={philosophy} onChange={(e) => setPhilosophy(e.target.value)} rows={2} placeholder="What&apos;s your approach to teaching dance?" className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#F3B2AB]/40 transition resize-none" />
						</div>
					</div>
				</Card>
			</motion.div>

			<motion.div variants={fadeUp} className="mb-6">
				<Card>
					<h3 className="font-display font-bold text-white mb-4">Experience Level</h3>
					<div className="grid gap-2 sm:grid-cols-3">
						{EXP_LEVELS.map((level) => (
							<button key={level.value} type="button" onClick={() => setExpLevel(level.value)} className={`rounded-xl border p-4 text-left transition ${expLevel === level.value ? "border-[#F3B2AB]/40 bg-[#F3B2AB]/10" : "border-white/10 bg-white/[0.03] hover:border-white/20"}`}>
								<p className={`text-sm font-semibold ${expLevel === level.value ? "text-[#F3B2AB]" : "text-white"}`}>{level.label}</p>
								<p className="text-xs text-zinc-500 mt-0.5">{level.desc}</p>
							</button>
						))}
					</div>
				</Card>
			</motion.div>

			<motion.div variants={fadeUp} className="mb-6">
				<Card>
					<h3 className="font-display font-bold text-white mb-4">Dance Styles</h3>
					<div className="flex flex-wrap gap-2">
						{DANCE_STYLES.map((style) => (
							<button key={style} type="button" onClick={() => toggleStyle(style)} className={`rounded-xl px-4 py-2 text-sm font-medium transition ${selectedStyles.includes(style) ? "bg-[#F3B2AB]/20 text-[#F3B2AB] border border-[#F3B2AB]/30" : "bg-white/5 text-zinc-400 border border-white/10 hover:border-white/20"}`}>
								{style}
							</button>
						))}
					</div>
				</Card>
			</motion.div>

			<motion.div variants={fadeUp} className="mb-6">
				<Card>
					<h3 className="font-display font-bold text-white mb-4">Social Links</h3>
					<div className="space-y-3">
						{[
							{ label: "Instagram", value: instagram, onChange: setInstagram, placeholder: "https://instagram.com/..." },
							{ label: "YouTube", value: youtube, onChange: setYoutube, placeholder: "https://youtube.com/..." },
							{ label: "TikTok", value: tiktok, onChange: setTiktok, placeholder: "https://tiktok.com/@..." },
						].map((social) => (
							<div key={social.label}>
								<label className="text-xs font-medium text-zinc-400 mb-1.5 block">{social.label}</label>
								<input value={social.value} onChange={(e) => social.onChange(e.target.value)} placeholder={social.placeholder} className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#F3B2AB]/40 transition" />
							</div>
						))}
					</div>
				</Card>
			</motion.div>

			<motion.div variants={fadeUp} className="flex items-center justify-between">
				<div>
					{saved ? <span className="text-sm text-emerald-400 font-medium">✓ Profile saved</span> : null}
				</div>
				<button type="button" onClick={handleSave} disabled={saving} className="rounded-xl bg-gradient-to-r from-[#F3B2AB] to-[#D88B80] px-6 py-3 text-sm font-bold text-[#0a0a0a] transition hover:brightness-110 disabled:opacity-50">
					{saving ? "Saving..." : "Save Profile"}
				</button>
			</motion.div>
		</motion.div>
	);
}
