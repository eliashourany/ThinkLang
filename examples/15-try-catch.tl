// Error handling with try/catch

type Summary {
  headline: string
  points: string[]
}

let text = "Brief update: all systems operational."

try {
  let result = think<Summary>("Summarize this text in detail")
    with context: text
  print result
} catch SchemaViolation (e) {
  print "Schema error occurred"
} catch ConfidenceTooLow (e) {
  print "Confidence too low for reliable result"
}
