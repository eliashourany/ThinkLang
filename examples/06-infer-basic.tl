// Lightweight inference — convert and classify values

let category = infer<string>("urgent: server is down!", "Classify this message priority as low, medium, high, or critical")

print category

let language = infer<string>("Bonjour le monde", "Detect the language")

print language
