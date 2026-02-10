// Pipeline operator for chaining AI operations

type Keywords {
  words: string[]
}

type Expanded {
  original: string[]
  related: string[]
}

let text = "Machine learning is transforming healthcare through early disease detection and personalized treatment plans."

let result = think<Keywords>("Extract the key technical terms from this text")
  with context: text
  |> think<Expanded>("Take these keywords and add related terms for each one")

print result
