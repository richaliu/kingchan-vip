import type { Metadata } from "next"
import { ArticleView } from "@/components/article-view"

export const metadata: Metadata = {
  title: "神州自有中天日，万国衣冠舞九韶",
  description: "西海东瀛涨落潮，商林股道冷炎飙。神州自有中天日，万国衣冠舞九韶。",
}

export default function ArticlePage() {
  return <ArticleView />
}
