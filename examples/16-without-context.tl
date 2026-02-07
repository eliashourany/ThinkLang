// Excluding sensitive data from AI context

type UserProfile {
  name: string
  interests: string[]
}

type Recommendation {
  items: string[]
  reason: string
}

let profile = "John Doe, age 30, interests: hiking, photography, cooking"
let sensitiveData = "SSN: 123-45-6789, Credit Card: 4111-1111-1111-1111"

let recommendation = think<Recommendation>("Suggest products based on user interests")
  with context: {
    profile,
    sensitiveData,
  }
  without context: sensitiveData

print recommendation
