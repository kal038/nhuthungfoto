import './App.css'

function App() {
  return (
    <div className="min-h-screen bg-background">
      {/* Floating Navbar */}
      <nav className="fixed top-4 left-4 right-4 z-50 bg-surface/85 backdrop-blur-xl border border-border rounded-xl shadow-lg px-6 py-3 flex items-center justify-between">
        <span className="font-heading text-lg font-semibold text-primary">
          nhuthungfoto
        </span>
        <div className="hidden md:flex items-center gap-6 text-sm text-secondary">
          <a href="#" className="hover:text-primary transition-colors duration-200 cursor-pointer">Trang chủ</a>
          <a href="#" className="hover:text-primary transition-colors duration-200 cursor-pointer">Tác phẩm</a>
          <a href="#" className="hover:text-primary transition-colors duration-200 cursor-pointer">Khóa học</a>
          <a href="#" className="hover:text-primary transition-colors duration-200 cursor-pointer">Đặt lịch</a>
        </div>
        <button className="bg-cta text-white px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity duration-200 cursor-pointer">
          Bắt Đầu Học
        </button>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center bg-gallery-dark overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />
        <div className="relative z-10 text-center text-white">
          <h1 className="font-heading text-5xl md:text-7xl font-bold tracking-tight mb-4">
            nhuthungfoto
          </h1>
          <p className="text-lg text-white/80 mb-8">
            Nhiếp ảnh gia • Giảng viên • 25+ năm kinh nghiệm
          </p>
          <button className="bg-cta text-white px-8 py-3 rounded-lg text-base font-semibold hover:opacity-90 transition-opacity duration-200 cursor-pointer shadow-glow">
            Khám Phá Tác Phẩm
          </button>
        </div>
      </section>

      {/* Placeholder sections */}
      <section className="py-24 px-8 max-w-6xl mx-auto text-center">
        <h2 className="font-heading text-3xl font-semibold mb-4">Về Nhựt Hùng</h2>
        <p className="text-secondary text-lg max-w-2xl mx-auto">
          Hơn 25 năm kinh nghiệm trong lĩnh vực nhiếp ảnh studio, cưới hỏi, và sự kiện. 
          Cựu giáo viên mỹ thuật và nhiếp ảnh tại trường phổ thông.
        </p>
      </section>
    </div>
  )
}

export default App
