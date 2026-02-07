import { Sentiment } from "./types.tl"

fn analyzeSentiment(text: string): Sentiment {
  let result = think<Sentiment>("Analyze the sentiment of this text")
    with context: text
  print result
}

fn greetUser(name: string): string {
  let greeting = think<string>("Generate a greeting")
    with context: name
  print greeting
}
