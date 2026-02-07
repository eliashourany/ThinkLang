// Pattern matching on values

type Sentiment {
  label: string
  score: float
}

let review = "This product is decent, works as expected but nothing special."

let sentiment = think<Confident<Sentiment>>("Analyze the sentiment")
  with context: review

let response = match sentiment {
  { confidence: >= 0.9 } => "High confidence result"
  { confidence: >= 0.5 } => "Moderate confidence result"
  _ => "Low confidence — manual review needed"
}

print response
