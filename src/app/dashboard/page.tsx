"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const RECOMMENDED = [
  { title: "Sufi Contemporary", artist: "Hassan K.", duration: "12m", level: "Intermediate", img: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=400" },
  { title: "Golden Hour Kathak", artist: "Priya S.", duration: "18m", level: "Advanced", img: "https://images.unsplash.com/photo-1547153760-18fc86324498?q=80&w=400" },
  { title: "Minimalist Hip Hop", artist: "Marcus G.", duration: "10m", level: "Beginner", img: "https://images.unsplash.com/photo-1535525153412-5a42439a210d?q=80&w=400" },
];

export default function DashboardPage() {
  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      {/* Header */}
      <header className="flex justify-between items-end mb-12">
        <div className="space-y-2">
          <h1 className="text-5xl font-extralight tracking-tight text-luxury">Welcome back, Alex.</h1>
          <p className="text-[#E7E5E5]/40 text-lg font-light tracking-wide italic">Your training space is ready.</p>
        </div>
      </header>

      {/* Hero Section: Continue Learning */}
      <section className="mb-16">
        <div className="group relative overflow-hidden rounded-3xl min-h-[400px] flex items-end p-10 border border-gold/10">
          <motion.div 
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-[2s] ease-out group-hover:scale-105"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=1200')" }}
          />
          <div className="absolute inset-0 z-1 bg-gradient-to-t from-obsidian via-obsidian/40 to-transparent" />
          
          <div className="relative z-10 w-full max-w-lg space-y-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold/80">Continue Learning</span>
            <h2 className="text-4xl font-light text-[#E7E5E5] leading-tight">Deep Breathing & Movement</h2>
            <div className="flex items-center gap-6 pt-2">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-[#E7E5E5]/40">Progress</span>
                <span className="text-lg font-light text-gold">45% Complete</span>
              </div>
              <div className="h-8 w-[1px] bg-gold/20" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-[#E7E5E5]/40">Next Step</span>
                <span className="text-lg font-light">Rhythm Basics</span>
              </div>
            </div>
            
            <button className="premium-button mt-6">
              Resume Session
            </button>
          </div>
        </div>
      </section>

      {/* Recommended Horizontal Scroll */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-light tracking-[0.1em] uppercase text-gold/80">Recommended for you</h3>
          <Link href="/dashboard/library" className="text-[12px] font-medium text-[#E7E5E5]/40 hover:text-gold transition-colors uppercase tracking-widest">View All</Link>
        </div>
        
        <div className="flex gap-6 overflow-x-auto pb-8 no-scrollbar">
          {RECOMMENDED.map((item, idx) => (
            <motion.div 
              key={idx}
              whileHover={{ y: -8 }}
              className="flex-shrink-0 w-80 premium-card p-0 overflow-hidden group border-gold/5"
            >
              <div className="h-48 overflow-hidden">
                <img src={item.img} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              </div>
              <div className="p-6 space-y-1">
                <span className="text-[10px] uppercase tracking-[0.15em] text-gold/60">{item.level} • {item.duration}</span>
                <h4 className="text-lg font-light text-[#E7E5E5]">{item.title}</h4>
                <p className="text-[12px] text-[#E7E5E5]/30 italic">with {item.artist}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
