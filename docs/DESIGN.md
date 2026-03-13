# nhuthungfoto — UI/UX Design Specification

> **Project:** nhuthungfoto Photography Education Platform
> **Generated:** March 13, 2026
> **Design Tokens:** [MASTER.md](file:///Users/khoilam/Projects/nhuthungfoto-site/.agent/design-system/nhuthungfoto/MASTER.md)
> **Stack:** React + Vite + Tailwind CSS + shadcn/ui

---

## 1. Design Philosophy

| Principle | Description |
|-----------|-------------|
| **Photos are the star** | Every design decision serves the photography. Neutral backgrounds, minimal chrome, let images breathe |
| **Beginner-friendly** | NOT the typical "artsy photographer portfolio." Clean, intuitive, accessible to everyone |
| **Motion-driven storytelling** | Scroll-triggered animations, parallax, smooth transitions create an immersive narrative |
| **Vietnamese-first** | Typography, content, and UX optimized for Vietnamese users with Be Vietnam Pro font |
| **Trust through premium feel** | Professional design earns trust for paid courses and premium reviews |

---

## 2. Design System

### Color Palette

| Role | Hex | Tailwind | Usage |
|------|-----|----------|-------|
| **Primary** | `#18181B` | `zinc-900` | Headlines, navbar, primary text |
| **Secondary** | `#3F3F46` | `zinc-700` | Body text, secondary elements |
| **CTA / Accent** | `#2563EB` | `blue-600` | Buttons, links, active states, progress bars |
| **Background** | `#FAFAFA` | `zinc-50` | Page backgrounds, light sections |
| **Text** | `#09090B` | `zinc-950` | Primary text content |

### Typography

- **Headings:** Be Vietnam Pro (500, 600, 700)
- **Body:** Noto Sans (300, 400, 500)
- **Signature:** Custom handwritten SVG brand mark (Nhựt Hùng's signature)

---

## 3. Visual Mockups & Page Layouts

### 3.1 Landing / Hero Page
![Hero section](/Users/khoilam/.gemini/antigravity/brain/e7fed741-e51d-4472-bfcc-c2728df83294/hero_section_1773382814207.png)

**Section Flow (Scroll-Triggered Storytelling):**
1. **Hero #1:** Full-bleed photograph with signature overlay.
2. **Hero #2:** Nhựt Hùng portrait with scroll-triggered entrance.
3. **Bio Section:** Credentials and philosophy.
4. **Portfolio Belt:** Horizontal scroll of curated shots.
5. **Student Transformations:** Before/after showcases.
6. **Testimonials:** Student reviews.
7. **CTA:** Primary conversion actions.

---

### 3.2 Portfolio Gallery
![Immersive gallery](/Users/khoilam/.gemini/antigravity/brain/e7fed741-e51d-4472-bfcc-c2728df83294/portfolio_gallery_1773382831241.png)

An **immersive, one-photo-at-a-time lightbox viewer**. No grids, no clutter. Pure focus on the photography.

---

### 3.3 Learning Dashboard
![Learning dashboard](/Users/khoilam/.gemini/antigravity/brain/e7fed741-e51d-4472-bfcc-c2728df83294/learning_dashboard_1773382862993.png)

Structured learning with video lessons, quiz sections, and a progress/credit sidebar.

---

### 3.4 Dual Grading View
![AI vs Human Review](/Users/khoilam/.gemini/antigravity/brain/e7fed741-e51d-4472-bfcc-c2728df83294/grading_comparison_1773382878193.png)

Side-by-side comparison of instant **AI Grading** (Habit loop) and premium **Nhựt Hùng Critique** (Loyalty/Upsell).

---

### 3.5 Booking & Coaching
![Booking page](/Users/khoilam/.gemini/antigravity/brain/e7fed741-e51d-4472-bfcc-c2728df83294/booking_page_1773382921821.png)

Simple booking flow for 1-on-1 sessions with VietQR/Momo payment integration.

---

## 4. Mobile Experience

![Mobile responsive](/Users/khoilam/.gemini/antigravity/brain/e7fed741-e51d-4472-bfcc-c2728df83294/mobile_responsive_1773382941753.png)

Responsive adapts to a mobile-first, gesture-driven interface with bottom navigation and stacked card layouts.

---

## 5. Technical Implementation

This specification maps to the [PRD](file:///Users/khoilam/Projects/nhuthungfoto-site/prd-nhuthungfoto-final.md). Technical tokens (hex, spacing, CSS) are maintained in the [MASTER.md](file:///Users/khoilam/Projects/nhuthungfoto-site/.agent/design-system/nhuthungfoto/MASTER.md) file for programmatic use.
