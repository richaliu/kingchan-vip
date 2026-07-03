import Link from "next/link"

const OPENING_VERSE = [
  "西海东瀛涨落潮，商林股道冷炎飙。",
  "神州自有中天日，万国衣冠舞九韶。",
]

const SECTIONS: { heading?: string; paragraphs: string[] }[] = [
  {
    paragraphs: [
      "以美欧日为动力源的全球化经济在 2000 年网络泡沫后出现历史性的发展瓶颈，而中国经济的崛起，是资本全球化历史与现实的必然要求，是一个有别于欧美日的全球经济新动力源的必然选择，是一个拥有最多人口、最大潜在市场的新兴经济体的必然承担，是不以任何人的意志为转移的必然趋势。",
      "当中国经济成为全球化新动力源时，中国股市也应当成为世界股市的新龙头，成为面向世界的超级大市场。中国的交易所，必将成为世界性交易所，世界上的公司必将以能到中国上市为荣。这一切，将成为中国新一轮特大型牛市真正的动力源泉。对此的任何短视，都将错失这一历史性机遇。",
      "站在中国成为全球经济新动力源的历史背景上，可以预言，这轮波澜壮阔的特大型牛市行情将分为三大阶段。",
    ],
  },
  {
    heading: "第一阶段",
    paragraphs: [
      "行情最主要体现在以权重股为代表的成分股上。在 A 股总市值超越其 GDP 之前，第一阶段的行情不会结束。很多人担心的所谓泡沫，在 A 股总市值超过 GDP 之前根本无从谈起，这是衡量市场整体估值最基础、最宏观的比价关系，脱离这个基础谈泡沫，都是盲人摸象。",
      "此阶段核心逻辑：股权分置改革完成后，全流通带来价值重估，国内核心资产价值被重新定价，国民经济支柱企业迎来估值修复，市场整体完成价值底层打底。",
    ],
  },
  {
    heading: "第二阶段",
    paragraphs: [
      "行情主要体现在那些拥有全球成长性的股票上，以全球成长股行情为标志。在中国股市成为亚洲市值最大、最重要的股市之前，第二阶段不会结束。",
      "随着中国制造业、出口、内需产业链走向全球，一批具备全球竞争力的龙头企业走出独立长牛；外资持续增配中国核心资产，A 股逐步取代日韩、东南亚市场，成为亚洲资本定价中心，人民币资产吸引力全面释放。",
    ],
  },
  {
    heading: "第三阶段",
    paragraphs: [
      "行情主要体现在那些拥有全球整合、重组能力的股票上，以全球整合、重组为标志。在中国股市成为世界上市值最大、最重要的股市之前，第三阶段不会结束。",
      "这一阶段对应中国 GDP 总量登顶全球，人民币国际化完成，国内企业大规模海外并购、全球产业布局；全球资本、企业、资源主动向中国资本市场聚拢，A 股成为全球资产定价核心，实现百年未有之经济格局。",
    ],
  },
  {
    paragraphs: [
      "很多人总把股市简单当成投机赌场，完全看不到资本市场承载大国复兴的历史使命。中国需要世界，而全球化经济下的世界更需要中国，这是现实要求也是历史必然。让中国经济成为世界经济的新动力，让中国金融市场成为世界金融市场的新龙头，这就是中国成为负责任大国所应该负起的历史性责任。",
      "而这一轮历史性大牛市，不过是这历史性责任的一个必然的历史性呈现。这历史性的舞台，将赋予所有参与者历史性的机会，激发其最大的潜能与创造。",
    ],
  },
]

export function ArticleView() {
  return (
    <main className="relative min-h-svh px-6 py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-secondary/50 to-transparent"
      />

      <article className="relative z-10 mx-auto flex max-w-2xl flex-col">
        {/* 返回 */}
        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-2 self-start text-sm tracking-wide text-muted-foreground transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span aria-hidden="true">←</span>
          返回临江仙
        </Link>

        {/* 标题区 */}
        <header className="flex flex-col items-center gap-6 text-center">
          <span className="h-px w-16 bg-accent" aria-hidden="true" />
          <h1 className="text-3xl font-semibold leading-snug tracking-wide text-foreground sm:text-4xl text-balance">
            神州自有中天日，万国衣冠舞九韶
          </h1>
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm tracking-widest text-muted-foreground sm:text-base">
              作者：缠中说禅
            </p>
            <p className="text-sm tracking-wide text-muted-foreground/80">
              发布时间：2007-03-19 08:52:42
            </p>
          </div>
          <span className="h-px w-16 bg-accent" aria-hidden="true" />
        </header>

        {/* 起首诗 */}
        <div className="mt-12 flex flex-col items-center gap-3 rounded-sm bg-card px-6 py-8 shadow-sm">
          {OPENING_VERSE.map((line, i) => (
            <p
              key={i}
              className="text-center text-lg leading-relaxed tracking-wide text-foreground/90 sm:text-xl text-pretty"
            >
              {line}
            </p>
          ))}
        </div>

        {/* 正文 */}
        <div className="mt-12 flex flex-col gap-8">
          {SECTIONS.map((section, i) => (
            <section key={i} className="flex flex-col gap-4">
              {section.heading ? (
                <h2 className="flex items-center gap-3 text-xl font-semibold tracking-wide text-accent sm:text-2xl">
                  <span className="h-5 w-1 rounded-sm bg-accent" aria-hidden="true" />
                  {section.heading}
                </h2>
              ) : null}
              {section.paragraphs.map((p, j) => (
                <p
                  key={j}
                  className="text-base leading-loose tracking-wide text-foreground/85 sm:text-lg text-pretty"
                >
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>

        {/* 结句 */}
        <div className="mt-14 flex flex-col items-center gap-3">
          <p className="text-sm tracking-widest text-muted-foreground">正是：</p>
          {OPENING_VERSE.map((line, i) => (
            <p
              key={i}
              className="text-center text-lg leading-relaxed tracking-wide text-foreground/90 sm:text-xl text-pretty"
            >
              {line}
            </p>
          ))}
          <span
            className="mt-6 flex h-12 w-12 items-center justify-center rounded-sm bg-accent font-brush text-lg text-accent-foreground shadow-sm"
            aria-label="印章"
          >
            禅
          </span>
        </div>
      </article>
    </main>
  )
}
