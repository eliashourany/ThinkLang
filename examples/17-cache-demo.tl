// Demonstrating exact-match caching — identical calls return cached results

type Fact {
  statement: string
  category: string
}

let topic = "photosynthesis"

// First call — hits the AI
let fact1 = think<Fact>("Tell me an interesting fact about this topic")
  with context: topic

print fact1

// Second identical call — should return cached result
let fact2 = think<Fact>("Tell me an interesting fact about this topic")
  with context: topic

print fact2
