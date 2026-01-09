export function chunkText(text, chunkSize = 500) {
  const chunks = [];
  const senetences = text.match(/[^\.!\?]+[\.!\?]+/g) || [text];

  let currentChunk = '';

  for (const sentence of senetences) {
    if ((currentChunk + sentence).length > chunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      } else {
        // Handle case where single sentence exceeds chunk size
        chunks.push(sentence.trim());
      }
    } else {
      currentChunk += sentence;
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  return chunks;
}
