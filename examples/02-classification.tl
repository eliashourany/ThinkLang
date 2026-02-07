// Email classification using a structured type

type Classification {
  @description("The category of the email")
  category: string
  @description("Confidence score from 0 to 1")
  confidence: float
  @description("Brief explanation")
  reason: string
}

let email = "Congratulations! You've won a FREE iPhone! Click here now to claim your prize!"

let result = think<Classification>("Classify this email as spam, promotional, personal, or work")
  with context: email

print result
