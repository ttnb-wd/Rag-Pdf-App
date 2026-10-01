// Test multi-study query specifically

async function testMultiStudy() {
  console.log('\n='.repeat(80));
  console.log('MULTI-STUDY QUERY TEST');
  console.log('='.repeat(80));
  
  const question = 'What dataset was used in the lung cancer studies?';
  console.log(`\nQuestion: ${question}\n`);
  
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
  
  console.log('RESPONSE:');
  console.log(`- Answer type: ${typeof result.answer}`);
  console.log(`- Answer value: ${result.answer}`);
  console.log(`- Answer length: ${result.answer?.length || 0}`);
  console.log(`- Citations: ${result.citations?.length || 0}`);
  
  if (result.answer && typeof result.answer === 'string' && result.answer.length > 10) {
    console.log('\n✅ PASS: Valid answer returned');
    console.log(`\nFull Answer:\n${result.answer}`);
  } else {
    console.log('\n❌ FAIL: Invalid or undefined answer');
  }
  
  console.log('\n' + '='.repeat(80));
  process.exit(result.answer && result.answer.length > 10 ? 0 : 1);
}

testMultiStudy().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
