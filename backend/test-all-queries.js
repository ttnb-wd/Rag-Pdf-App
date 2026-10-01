// Comprehensive test of all dataset queries

async function testQuery(question, expectedDataset) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`QUERY: ${question}`);
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
  
  if (expectedDataset) {
    const answerLower = result.answer.toLowerCase();
    const expectedLower = expectedDataset.toLowerCase();
    const match = answerLower.includes(expectedLower);
    console.log(`\nEXPECTED DATASET: ${expectedDataset}`);
    console.log(`RESULT: ${match ? '✓ CORRECT' : '✗ WRONG'}`);
  }
  
  console.log(`\nCITATIONS: ${result.citations?.length || 0}`);
}

async function main() {
  console.log('\n\n🧪 TESTING DATASET QUERIES\n');
  
  // Test 1: Deep learning study
  await testQuery(
    'What dataset was used in the deep learning-based lung cancer study?',
    'Chest CT-Scan Images Dataset'
  );
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 2: Kaggle acquisition
  await testQuery(
    'What dataset did the study obtain from Kaggle?',
    'Chest CT-Scan Images Dataset'
  );
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 3: LungPaper dataset
  await testQuery(
    'What dataset was used in LungPaper?',
    'LOTUS'
  );
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 4: Multi-study query
  await testQuery(
    'What dataset was used in the lung cancer studies?',
    null // Multiple datasets expected
  );
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 5: Normal non-dataset question
  await testQuery(
    'What are the main findings of the deep learning study?',
    null
  );
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 6: Out-of-domain question
  await testQuery(
    'What is the capital of France?',
    null
  );
  
  console.log('\n\n✅ ALL TESTS COMPLETE!\n');
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
