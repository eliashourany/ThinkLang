// Using context to scope data for AI calls

type Translation {
  text: string
  sourceLanguage: string
  targetLanguage: string
}

let sourceText = "The quick brown fox jumps over the lazy dog"
let targetLang = "French"

let result = think<Translation>("Translate the source text to the target language")
  with context: {
    sourceText,
    targetLang,
  }

print result
