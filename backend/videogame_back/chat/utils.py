import bleach


def sanitize_message(message: str) -> str:
  """
  Sanitizes the message to prevent XSS attacks by escaping all HTML tags.
  Only allows plain text.
  """
  # We use bleach to clean the message.
  # tags=[] and attributes={} ensures all HTML is escaped.
  return bleach.clean(message, tags=[], attributes={}, strip=True)


BAD_WORDS = [
  "puto",
  "puta",
  "pendejo",
  "pendeja",
  "mierda",
  "culero",
  "culera",
  "fuck",
  "shit",
  "asshole",
  "bitch",
  "bastard",
  "cabron",
  "cabrona",
  "verga",
  "pinche",
  "maricon",
  "joto",
  "zorra",
  "puta",
  "madre", # sometimes used offensively depending on context, maybe safer to leave it or filter
  "cunt",
  "dick",
  "cock",
  "pussy",
  "whore",
  "slut",
  "faggot",
  "nigger",
  "idiot",
  "stupid",
  "estupido",
  "estupida",
  "imbecil",
  "idiota",
  "retard",
  "nazi",
  "hitler",
  "pedophile",
  "pedo",
]

def filter_bad_words(message: str) -> str:
  """
  Replaces offensive words with Asterisks.
  """

  words = message.split()
  clean_words = []

  for word in words:
    # Check if the word (lowercased and without punctuation) is in the list
    clean_word = word.lower().strip(".,!?;:")
    if clean_word in BAD_WORDS:
      clean_words.append("*" * len(word))
    else:
      clean_words.append(word)

  return " ".join(clean_words)


def process_message(message: str) -> str:
  """
  Processes the message with all security filters.
  """
  sanitized = sanitize_message(message)
  filtered = filter_bad_words(sanitized)
  return filtered
