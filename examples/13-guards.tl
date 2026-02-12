// Guard constraints with automatic retry

type Summary {
  @description("A concise summary of the article")
  text: string
  @description("Number of key points captured")
  keyPoints: int
}

let article = "Artificial intelligence has rapidly evolved from a niche academic pursuit into a transformative force reshaping industries worldwide. In healthcare, AI-powered diagnostic tools now detect diseases earlier and more accurately than ever before. Financial institutions leverage machine learning algorithms to detect fraud in real-time, saving billions annually. The transportation sector is being revolutionized by autonomous vehicles, while manufacturing benefits from predictive maintenance systems that prevent costly equipment failures. Education is also being transformed, with personalized learning platforms that adapt to individual student needs. Despite these advances, significant challenges remain around bias, transparency, and the societal impact of automation on employment."

let result = think<Summary>("Summarize this article in 50 to 200 characters")
  with context: article
  guard {
    length: 50..200
  }
  on_fail: retry(3)

print result
