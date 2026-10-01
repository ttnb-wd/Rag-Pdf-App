// Test Kaggle-specific query

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
      topK: 3
    })
  });
  
  const result = await response.json();
  
  console.log(`\nANSWER: ${result.answer}`);
}

async function main() {
  await testQuery('What dataset did the study obtain from Kaggle?');
  
  console.log('\n\nTest complete!');
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
