// Extract structured entities from a document

type Person {
  name: string
  role: string
  company: string?
}

type ExtractionResult {
  @maxItems(10)
  people: Person[]
  @description("Brief summary of the document")
  summary: string
}

let document = "Meeting notes: John Smith (CEO of Acme Corp) met with Jane Doe (CTO of TechStart) to discuss the upcoming merger. Bob Johnson from legal was also present."

let extracted = think<ExtractionResult>("Extract all people mentioned and summarize the document")
  with context: document

print extracted
