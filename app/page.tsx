import Link from "next/link"
import { PoemScroll } from "@/components/poem-scroll"

export default function Page() {
  return (
    <>
      {/* K线图入口（古风印章样式） */}
      <Link
        href="/kline"
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          zIndex: 60,
          padding: "10px 18px",
          border: "2px solid #8b4513",
          borderRadius: 8,
          background: "rgba(139,69,19,0.08)",
          color: "#8b4513",
          fontFamily: "var(--font-brush), serif",
          fontSize: 18,
          letterSpacing: 2,
          textDecoration: "none",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          backdropFilter: "blur(4px)",
          transition: "all .2s",
        }}
      >
        📈 K线图
      </Link>
      <PoemScroll />
    </>
  )
}
