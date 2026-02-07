// Sentiment analysis with confidence tracking

type Sentiment {
  @description("positive, negative, or neutral")
  label: string
  @description("Intensity from 1-10")
  intensity: int
}

let review = "This product is absolutely amazing! Best purchase I've ever made."

let sentiment = think<Confident<Sentiment>>("Analyze the sentiment of this review")
  with context: review

print sentiment
