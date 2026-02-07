// Uncertain modifier — marks AI-derived values that need explicit unwrapping

type Category {
  name: string
  confidence: float
}

let text = "A beautiful handcrafted ceramic vase with floral patterns"

// Mark as uncertain — compiler enforces unwrap before use
let uncertain category = think<Category>("Classify this product")
  with context: text

// Must unwrap to use the value
let safeName = category.unwrap()
print safeName

// Or use expect with threshold
let highConfName = category.expect(0.8)
print highConfName
