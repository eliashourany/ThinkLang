// Summarize a long text

type Summary {
  @description("One-line headline")
  headline: string
  @description("Key points from the text")
  keyPoints: string[]
  @description("Overall tone: positive, negative, or neutral")
  tone: string
}

let article = "The global technology sector experienced significant growth in 2025, with AI-related companies leading the charge. Major cloud providers reported record revenues, while startup funding reached new highs. However, concerns about regulation and energy consumption continue to mount. Industry leaders called for balanced approaches to governance, emphasizing innovation alongside responsibility."

let summary = think<Summary>("Summarize this article")
  with context: article

print summary
