const LINES = [
  "浊水倾波三万里，愀然独坐孤峰。",
  "龙潜狮睡候飙风。",
  "无情皆竖子，有泪亦英雄。",
  "长剑倚天星斗烂，古今过眼成空。",
  "乾坤俯仰任穷通。",
  "半轮沧海上，一苇大江东。",
]

export function PoemScroll() {
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-6 py-16">
      {/* 远山淡影底纹 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-secondary/60 to-transparent"
      />

      <article className="relative z-10 flex flex-col items-center">
        {/* 词牌名 */}
        <header className="mb-10 flex flex-col items-center gap-4 text-center">
          <span className="h-px w-16 bg-accent" aria-hidden="true" />
          <h1 className="font-brush text-6xl leading-none tracking-widest text-foreground sm:text-7xl md:text-8xl text-balance">
            临江仙
          </h1>
          <span className="h-px w-16 bg-accent" aria-hidden="true" />
        </header>

        {/* 诗句 */}
        <div className="flex max-w-2xl flex-col items-center gap-5">
          {LINES.map((line, i) => (
            <p
              key={i}
              className="text-center text-xl leading-relaxed tracking-wide text-foreground/90 sm:text-2xl md:text-3xl text-pretty"
            >
              {line}
            </p>
          ))}
        </div>

        {/* 作者署名 */}
        <div className="mt-10 flex flex-col items-center gap-1 text-center">
          <p className="text-base tracking-widest text-muted-foreground sm:text-lg">
            缠中说禅
          </p>
          <p className="text-sm tracking-wide text-muted-foreground/80">
            2006-02-01
          </p>
        </div>

        {/* 印章 */}
        <footer className="mt-10 flex items-center gap-4">
          <span className="h-px w-10 bg-border" aria-hidden="true" />
          <span
            className="flex h-12 w-12 items-center justify-center rounded-sm bg-accent font-brush text-lg text-accent-foreground shadow-sm"
            aria-label="印章"
          >
            词
          </span>
          <span className="h-px w-10 bg-border" aria-hidden="true" />
        </footer>
      </article>
    </main>
  )
}
