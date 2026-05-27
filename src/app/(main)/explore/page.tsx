"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const HERO_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuC_Zsmxtab-488lVip_GHTewx_jWwgJvZH2UKCgYZXE4fWI-w-pwGLGjP5gCbWNIjDFywIoQrsnagzjurQZY3ofs7tGsIE6-kTJl5gxKeTHDXjcvsBrDJT2kzwynKvtg7NLF30r6Wpo1vsvc5r0BnhYMZjXCSQkT3IH9zVvydnj75Lf7pdLXbugSp6KRTB3A1tiedTX5ZzKt91MIw225Rok7KrRv60LiEt4r-KsL1tb780o3_IQxRPhRC1jSzWUN7NiMznsvgxf-5I";

const CARD_MAIN =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBinht43lU5Abc6Gu04lo6BUhHvsnNzMYgCTy1eQtGgtwNuwIT6d0q1ZC-2SI3Pg_wkdM2JurhW1yTFGx00764aXEPMjs6cTQ9-3FzEqa5ibpZZDytA529A0JKvkrRSjGgb_UMyzhXBX_UZJc7IjjLUI0YUcw1KiELK6SXv-kC_a1rdL7ExI6ws_8tBmzpiJLULdQhoFpoO0eZZY3vwlMhulxE7hBbGWiMlBuZzZw0Pe0aANC03rD4JpgZZ9ys5AbbgZTZZ6rOjQQc";

const CARD_SIDE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDx5aHgvCjnXPHmy1FGmKh2daHWuxnz-R8dtBYdv1blIc81iTKARC5UAVJNAsn8Qof9ALGJ2sH-fjIvN5IXD-2zdsOa3YPRWy9GF3PHE6UFoLY2f17kGnCY-x_a12IG2NiWGu9ZXy3SJ55z6VVCIDzZb8sFAmxbqLfRX8dsvunBn4WYDHjuA52VUlumgeCP4xgBZhMLX9t-aY4-pCENg_HGMf_JTc-IyDyW7HHNK7SlHQnNSH94dQdpA-ZVXp92TVSxtaxT451Jr1k";

const BHANGRA_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBFQ3Zo0IUa2c2_ZcUNdqFS8sMaVkUZw4T10rUi9TAOWOvxh4yM4G6psKSnKZuTUys8Soejlmr9JHcIdLdFvZNLZHLFFlYKhAz9Sriw8UhzWCpDkJJKaXVrLpz1USH71fYOm_G_XiZ-KsvBRucH0lLms0bOQa8C_pNxlAhPLPc-Lt5BkPr9_gRl5UgcCHH6MdAGtBB1FrXXXgEKQpD3zUvXTzPSVXFYYVZaJbgJ7Tkrrd7qKVtlugFDjBC_OqJnEeGW0D8tKXaxAy4";

export default function ExplorePage() {
  return (
    <main className="bg-[#fbf9f4] text-[#31332e]">
      <section className="relative overflow-hidden px-6 pb-16 pt-8 md:px-12 md:pb-24 md:pt-10">
        <div className="relative z-10 grid items-center gap-10 md:grid-cols-[1fr_1.15fr]">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#6c513220] bg-white/70 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#6a5a47]">
              <span>Streak</span>
              <span>3-Day Streak</span>
            </div>
            <h1 className="mt-6 text-[3.6rem] font-extrabold leading-[0.9] tracking-tight text-[#725b3f] sm:text-[4.8rem] md:text-[8.2rem]">Flow</h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-[#5e6059] md:text-lg">
              The kinetic gallery of movement. Elevate your practice through an editorial experience of Indian classical and contemporary dance.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/learn/feed?style=bollywood" className="rounded-full border border-[#6c513228] bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#725b3f] hover:bg-white">
                Bollywood
              </Link>
              <Link href="/learn/feed?style=bhangra" className="rounded-full border border-[#6c513228] bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#725b3f] hover:bg-white">
                Bhangra
              </Link>
              <Link href="/learn/feed?style=mix" className="rounded-full border border-[#6c513228] bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#725b3f] hover:bg-white">
                Mix
              </Link>
              <Link href="/subscribe" className="rounded-full border border-[#725b3f]/25 bg-[#725b3f] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#fff7f3] hover:brightness-110">
                Subscriptions
              </Link>
            </div>
            <Link
              href="/learn/feed?style=mix"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#725b3f] px-7 py-3 text-sm font-semibold text-[#fff7f3] transition hover:brightness-110"
            >
              Start Today&apos;s Lesson
              <span>&gt;</span>
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.65 }} className="relative">
            <img src={HERO_IMAGE} alt="Flow hero" className="h-[460px] w-full rounded-[2rem] object-cover md:h-[640px]" />
            <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-gradient-to-r from-[#fbf9f4] via-transparent to-transparent" />
          </motion.div>
        </div>
      </section>

      <section className="bg-[#f5f4ed] px-6 py-16 md:px-12 md:py-24">
        <h2 className="mb-12 text-4xl font-bold tracking-tight text-[#1f1f1b] md:text-5xl">Explore Dance Styles</h2>

        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8f7f6b]">Discover</p>
            <h3 className="mt-2 text-3xl font-bold tracking-tight text-[#1f1f1b] md:text-4xl">Bollywood Flow</h3>
          </div>
            <Link href="/learn/feed?style=bollywood" className="text-xs font-bold uppercase tracking-[0.14em] text-[#725b3f] hover:opacity-80">
            View Collection &gt;
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-[1.8fr_1fr]">
            <Link href="/learn/feed?style=bollywood" className="group relative block overflow-hidden rounded-[2rem] bg-[#e3e3db]">
            <img src={CARD_MAIN} alt="Midnight Monsoon Ritual" className="h-[360px] w-full object-cover transition duration-700 group-hover:scale-105 md:h-[520px]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            <div className="absolute bottom-5 left-5 text-white md:bottom-8 md:left-8">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em]">
                <span className="rounded-full bg-[#725b3f] px-3 py-1">Intermediate</span>
                <span>45 mins</span>
              </div>
              <h3 className="text-2xl font-bold md:text-4xl">Midnight Monsoon Ritual</h3>
            </div>
          </Link>

          <div className="grid gap-6">
            <article className="relative overflow-hidden rounded-[1.5rem] bg-[#e3e3db]">
              <img src={CARD_SIDE} alt="Mudra edit" className="h-[160px] w-full object-cover md:h-[220px]" />
              <div className="absolute inset-0 bg-black/25" />
              <div className="absolute inset-0 grid place-items-center text-center text-white">
                <div>
                  <h4 className="text-2xl font-bold">The Mudra Edit</h4>
                  <p className="mt-1 text-xs">Classical foundation for modern flow</p>
                </div>
              </div>
            </article>

            <article className="rounded-[1.5rem] bg-[#efeee7] p-7">
              <p className="text-3xl text-[#725b3f]">*</p>
              <h4 className="mt-4 text-2xl font-bold text-[#1f1f1b]">Expressive Arts</h4>
              <p className="mt-2 text-sm leading-relaxed text-[#5e6059]">
                Master the subtle art of facial expressions and storytelling through movement.
              </p>
              <Link href="/learn/routine-bollywood-first-class" className="mt-8 inline-flex text-xs font-bold uppercase tracking-[0.12em] text-[#725b3f]">
                Explore Module &gt;
              </Link>
            </article>

            <article className="rounded-[1.5rem] border border-[#725b3f]/15 bg-[#725b3f] p-7 text-[#fff7f3]">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#f1dfcf]">Premium access</p>
              <h4 className="mt-4 text-2xl font-bold">Unlock routines with a subscription</h4>
              <p className="mt-2 text-sm leading-relaxed text-[#f7ede3]">
                Get recurring access to premium routines, workshops, and creator drops.
              </p>
              <Link href="/subscribe" className="mt-8 inline-flex rounded-full bg-white px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#725b3f] transition hover:bg-[#f7efe6]">
                View plans
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section className="px-6 py-16 md:px-12 md:py-24">
        <div className="grid items-center gap-10 md:grid-cols-[1.1fr_1fr]">
          <div className="relative order-2 md:order-1">
            <Link href="/flow?style=bhangra" className="group block">
              <img src={BHANGRA_IMAGE} alt="Bhangra flow" className="h-[420px] w-full rounded-[2rem] object-cover transition duration-700 group-hover:scale-[1.01] md:h-[620px]" />
            </Link>
          </div>

          <div className="order-1 md:order-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8f7f6b]">Kinetic Energy</p>
            <h2 className="mt-3 text-5xl font-bold leading-[0.9] tracking-tight text-[#1f1f1b] md:text-7xl">Bhangra Flow</h2>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-[#5e6059] md:text-lg">
              High-octane, powerful, and deeply grounded. Experience the fusion of traditional Punjabi energy with modern athletic conditioning.
            </p>
            <Link href="/flow?style=bhangra" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#725b3f] px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#fff7f3] hover:brightness-110">
              Open Bhangra Flow
            </Link>

            <div className="mt-8 space-y-4">
              <div className="rounded-2xl bg-[#f5f4ed] px-5 py-4">
                <p className="text-sm font-semibold text-[#1f1f1b]">Power Foundations</p>
                <p className="text-xs text-[#6a6b65]">Core strength and explosive footwork.</p>
              </div>
              <div className="rounded-2xl bg-[#f5f4ed] px-5 py-4">
                <p className="text-sm font-semibold text-[#1f1f1b]">Rhythmic Patterns</p>
                <p className="text-xs text-[#6a6b65]">Complex 8-count syncopations.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-20 md:px-12 md:pb-24">
        <div className="rounded-[2rem] bg-[#e3e3db] px-6 py-12 text-center md:px-12 md:py-16">
          <p className="text-4xl text-[#725b3f]">*</p>
          <h3 className="mt-4 text-3xl font-bold text-[#1f1f1b] md:text-4xl">Join the Gallery</h3>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-[#5e6059] md:text-base">
            Weekly curated masterclasses, movement insights, and community highlights delivered to your inbox.
          </p>

          <form className="mx-auto mt-8 flex w-full max-w-md flex-col gap-2 sm:flex-row">
            <input
              type="email"
              placeholder="Your email address"
              className="h-11 w-full flex-1 rounded-full border border-[#6c513220] bg-white px-4 text-sm text-[#31332e] outline-none"
            />
            <button type="button" className="h-11 w-full rounded-full bg-[#725b3f] px-6 text-sm font-semibold text-[#fff7f3] sm:w-auto">
              Join
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
