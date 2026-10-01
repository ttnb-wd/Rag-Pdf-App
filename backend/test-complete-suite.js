// Complete test suite

async function test(num, question, description) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TEST ${num}: ${description}`);
  console.log(`Question: ${question}`);
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
  
  console.log(`\nAnswer: ${result.answer}`);
  console.log(`Citations: ${result.citations?.length || 0}`);
  
  return result;
}

async function main() {
  console.log('\n🧪 COMPLETE VALIDATION SUITE\n');
  
  // Test 1
  const t1 = await test(
    1,
    'What dataset was used in the deep learning-based lung cancer study?',
    'Deep learning study dataset'
  );
  await new Promise(r => setTimeout(r, 4000));
  
  // Test 2
  const t2 = await test(
    2,
    'What dataset did the study obtain from Kaggle?',
    'Kaggle acquisition'
  );
  await new Promise(r => setTimeout(r, 4000));
  
  // Test 3
  const t3 = await test(
    3,
    'What dataset was used in LungPaper?',
    'LungPaper dataset'
  );
  await new Promise(r => setTimeout(r, 4000));
  
  // Test 4
  const t4 = await test(
    4,
    'What dataset was used in the lung cancer studies?',
    'Multi-study query'
  );
  await new Promise(r => setTimeout(r, 4000));
  
  // Test 5
  const t5 = await test(
    5,
    'What machine learning models were evaluated in the study?',
    'Normal non-dataset question'
  );
  await new Promise(r => setTimeout(r, 4000));
  
  // Test 6
  const t6 = await test(
    6,
    'What is quantum computing?',
    'Out-of-domain question'
  );
  
  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 TEST RESULTS');
  console.log('='.repeat(80));
  
  const pass1 = t1.answer?.toLowerCase().includes('chest') && t1.answer?.toLowerCase().includes('ct');
  const pass2 = t2.answer?.toLowerCase().includes('chest') && t2.answer?.toLowerCase().includes('ct');
  const pass3 = t3.answer?.toLowerCase().includes('lotus');
  const pass4 = t4.answer && t4.answer.length > 50;
  const pass5 = t5.answer && t5.answer.length > 50;
  const pass6 = t6.answer?.toLowerCase().includes('cannot find');
  
  console.log(`\n1. Deep learning dataset:     ${pass1 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`2. Kaggle dataset:            ${pass2 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`3. LungPaper dataset:         ${pass3 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`4. Multi-study query:         ${pass4 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`5. Normal non-dataset query:  ${pass5 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`6. Out-of-domain query:       ${pass6 ? '✅ PASS' : '❌ FAIL'}`);
  
  const passCount = [pass1, pass2, pass3, pass4, pass5, pass6].filter(Boolean).length;
  console.log(`\n📈 OVERALL: ${passCount}/6 tests passed`);
  console.log(passCount === 6 ? '\n🎉 ALL TESTS PASSED!' : '\n⚠️  Some tests failed');
  console.log('='.repeat(80) + '\n');
  
  process.exit(passCount === 6 ? 0 : 1);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
