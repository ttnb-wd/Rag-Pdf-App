// Test dataset queries to debug the retrieval logic

async function testQuery(question) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TESTING: ${question}`);
  console.log('='.repeat(80));
  
  const response = await fetch('http://localhost:5000/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question: question,
      topK: 5
    })
  });
  
  const result = await response.json();
  
  console.log(`\nANSWER: ${result.answer}`);
  console.log(`\nCITATIONS:`);
  result.citations?.forEach((citation, idx) => {
    console.log(`\n[${idx + 1}] ${citation.documentName || 'Unknown'}`);
    console.log(`Chunk ${citation.chunkIndex || 'N/A'}`);
    if (citation.content) {
      console.log(`Content preview: ${citation.content.substring(0, 200)}...`);
    }
  });
}

async function main() {
  // Query 1: Deep learning study dataset
  await testQuery('What dataset was used in the deep learning-based lung cancer study?');
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Query 2: Kaggle dataset
  await testQuery('What dataset did the study obtain from Kaggle?');
  
  console.log('\n\nTests complete!');
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
