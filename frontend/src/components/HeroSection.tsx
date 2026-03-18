import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

export function HeroSection() {
  return (
    <section
      id="hero"
      className="relative h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background Image */}
      <img
        src="/images/hero-bg.jpg"
        alt="Nhựt Hùng photography showcase"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Dark Gradient Overlay */}
      <div className="absolute inset-0 bg-linear-to-b from-black/30 via-black/10 to-black/50" />

      {/* Content */}
      <div className="relative z-10 text-center text-white px-4 max-w-2xl">
        {/* Signature Logo */}
        <motion.img
          src="/images/signature.png"
          alt="nhuthungfoto"
          className="mx-auto max-w-[320px] md:max-w-[400px] mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />

        {/* Subtext */}
        <motion.p
          className="text-base md:text-lg text-white/80 mb-8 tracking-wide"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.3 }}
        >
          Nhiếp ảnh gia • Giảng viên • 30+ năm kinh nghiệm
        </motion.p>

        {/* CTA Button */}
        <motion.a
          href="#portfolio"
          className="inline-block bg-cta text-white px-8 py-3 rounded-lg text-base font-semibold hover:opacity-90 transition-opacity duration-200 cursor-pointer shadow-glow"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.5 }}
        >
          Khám Phá Tác Phẩm
        </motion.a>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <ChevronDown className="h-6 w-6 text-white/60" />
        </motion.div>
      </motion.div>
    </section>
  )
}
