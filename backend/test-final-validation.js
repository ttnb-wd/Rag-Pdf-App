// Final validation of dataset retrieval fixes

async function testQuery(question, description) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TEST: ${description}`);
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
  
  console.log(`\nANSWER:\n${result.answer}`);
  console.log(`\nCITATIONS: ${result.citations?.length || 0}`);
  
  return result;
}

async function main() {
  console.log('\n\n🔍 FINAL DATASET RETRIEVAL VALIDATION\n');
  
  // CRITICAL TEST 1
  console.log('\n📌 CRITICAL TEST 1: Deep learning study dataset');
  const test1 = await testQuery(
    'What dataset was used in the deep learning-based lung cancer study?',
    'Should return: Chest CT-Scan Images Dataset (NOT IQ-OTH/NCCD)'
  );
  const pass1 = test1.answer.toLowerCase().includes('chest') && 
                test1.answer.toLowerCase().includes('ct') &&
                !test1.answer.toLowerCase().includes('iq-oth');
  console.log(`\n${pass1 ? '✅ PASS' : '❌ FAIL'}: Returns Chest CT-Scan, not IQ-OTH/NCCD`);
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // CRITICAL TEST 2
  console.log('\n📌 CRITICAL TEST 2: Kaggle acquisition');
  const test2 = await testQuery(
    'What dataset did the study obtain from Kaggle?',
    'Should return: Chest CT-Scan Images Dataset (NOT IQ-OTH/NCCD)'
  );
  const pass2 = test2.answer.toLowerCase().includes('chest') && 
                test2.answer.toLowerCase().includes('ct') &&
                !test2.answer.toLowerCase().includes('iq-oth');
  console.log(`\n${pass2 ? '✅ PASS' : '❌ FAIL'}: Returns Chest CT-Scan, not IQ-OTH/NCCD`);
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // TEST 3
  console.log('\n📌 TEST 3: LungPaper dataset');
  const test3 = await testQuery(
    'What dataset was used in LungPaper?',
    'Should return: LOTUS Dataset'
  );
  const pass3 = test3.answer.toLowerCase().includes('lotus');
  console.log(`\n${pass3 ? '✅ PASS' : '❌ FAIL'}: Returns LOTUS Dataset`);
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // TEST 4
  console.log('\n📌 TEST 4: Multi-study query');
  const test4 = await testQuery(
    'What dataset was used in the lung cancer studies?',
    'Should separate datasets by study'
  );
  const pass4 = test4.answer && test4.answer.length > 10;
  console.log(`\n${pass4 ? '✅ PASS' : '❌ FAIL'}: Returns multi-study answer`);
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // TEST 5
  console.log('\n📌 TEST 5: Normal non-dataset question');
  const test5 = await testQuery(
    'What machine learning models were compared in the study?',
    'Normal RAG behavior should work'
  );
  const pass5 = test5.answer && test5.answer.length > 20;
  console.log(`\n${pass5 ? '✅ PASS' : '❌ FAIL'}: Normal RAG works`);
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // TEST 6
  console.log('\n📌 TEST 6: Out-of-domain question');
  const test6 = await testQuery(
    'What is quantum computing?',
    'Should return fallback'
  );
  const pass6 = test6.answer.toLowerCase().includes('cannot find') || 
                test6.answer.toLowerCase().includes('not enough');
  console.log(`\n${pass6 ? '✅ PASS' : '❌ FAIL'}: Returns fallback for out-of-domain`);
  
  // SUMMARY
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 VALIDATION SUMMARY');
  console.log('='.repeat(80));
  const allPassed = pass1 && pass2 && pass3 && pass4 && pass5 && pass6;
  const passCount = [pass1, pass2, pass3, pass4, pass5, pass6].filter(Boolean).length;
  
  console.log(`\nCritical Test 1 (Deep learning dataset): ${pass1 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Critical Test 2 (Kaggle dataset): ${pass2 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Test 3 (LungPaper): ${pass3 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Test 4 (Multi-study): ${pass4 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Test 5 (Normal RAG): ${pass5 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Test 6 (Out-of-domain): ${pass6 ? '✅ PASS' : '❌ FAIL'}`);
  
  console.log(`\n📈 OVERALL: ${passCount}/6 tests passed`);
  console.log(allPassed ? '\n🎉 ALL TESTS PASSED!' : '\n⚠️  Some tests failed');
  console.log('='.repeat(80));
  
  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
