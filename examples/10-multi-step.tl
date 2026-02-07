// Multi-step processing with multiple think calls

type Entities {
  technologies: string[]
  applications: string[]
  challenges: string[]
}

type Analysis {
  @description("Brief assessment of the technology landscape")
  assessment: string
  @description("Top opportunities")
  opportunities: string[]
  @description("Key risks")
  risks: string[]
}

let report = "Quantum computing is advancing rapidly. Google and IBM are leading with 1000+ qubit processors. Applications in cryptography, drug discovery, and financial modeling show promise. However, error correction remains a major challenge, and the technology requires near-absolute-zero temperatures."

let entities = think<Entities>("Extract all technologies, applications, and challenges mentioned")
  with context: report

let analysis = think<Analysis>("Analyze the technology landscape based on these entities and the original report")
  with context: {
    entities,
    report,
  }

print entities
print analysis
