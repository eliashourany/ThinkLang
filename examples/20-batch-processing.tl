// Example 20: Batch Processing
// Process multiple items through AI in parallel

type Sentiment {
  @description("positive, negative, or neutral")
  label: string
  @description("confidence score 0-1")
  score: float
}

// A list of customer reviews to classify
let reviews = ["Great product, love it!", "Terrible experience, never again", "It was okay, nothing special", "Best purchase I ever made", "Completely broken on arrival"]

// Use map_think to classify all reviews in parallel
let sentiments = map_think<Sentiment>(reviews, "Classify the sentiment of this review")
  concurrency: 3

print sentiments
