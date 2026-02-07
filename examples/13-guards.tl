// Guard constraints with retry and fallback

type Translation {
  text: string
  sourceLanguage: string
  targetLanguage: string
}

let sourceText = "Hello, how are you today?"

let result = think<Translation>("Translate to Spanish")
  with context: sourceText
  guard {
    length: 5..500
  }
  on_fail: retry(3)

print result
