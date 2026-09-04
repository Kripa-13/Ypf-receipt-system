import { verifyTransactionWithBank } from '../lib/bank-verifier';

async function runBankVerificationTests() {
  console.log('====================================================');
  console.log('🏦 TESTING DIRECT BANK AMOUNT VERIFICATION FEATURE');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  // Test 1: Pre-seeded Axis Bank UTR (AXISNP1234567890) with exact ₹1,000.00
  total++;
  console.log('Test 1: Pre-seeded Axis Bank UTR (AXISNP1234567890) with exact ₹1,000.00...');
  const res1 = await verifyTransactionWithBank('AXISNP1234567890', 1000);
  if (res1.status === 'VERIFIED' && res1.bankName === 'Axis Bank' && res1.bankAuthRef === 'AXIS-AUTH-884210') {
    console.log('  ✅ PASSED:', res1.message);
    passed++;
  } else {
    console.error('  ❌ FAILED:', res1);
  }

  // Test 2: Pre-seeded UTR with wrong amount (₹500 instead of ₹1,000)
  total++;
  console.log('\nTest 2: Pre-seeded UTR with Amount Mismatch (₹500 instead of ₹1,000)...');
  const res2 = await verifyTransactionWithBank('AXISNP1234567890', 500);
  if (res2.status === 'AMOUNT_MISMATCH' && !res2.success) {
    console.log('  ✅ PASSED:', res2.message);
    passed++;
  } else {
    console.error('  ❌ FAILED:', res2);
  }

  // Test 3: Pre-seeded UPI transaction (UPI423456789012) with ₹100.00 (Image 2 slip amount)
  total++;
  console.log('\nTest 3: Pre-seeded UPI transaction with ₹100.00 (from Image 2 paper slip)...');
  const res3 = await verifyTransactionWithBank('UPI423456789012', 100);
  if (res3.status === 'VERIFIED' && res3.bankName === 'State Bank of India') {
    console.log('  ✅ PASSED:', res3.message);
    passed++;
  } else {
    console.error('  ❌ FAILED:', res3);
  }

  // Test 4: Dynamic 12-digit UPI RRN cross-check via banking gateway
  total++;
  console.log('\nTest 4: Dynamic 12-digit UPI RRN verification (998877665544) for ₹2,500.00...');
  const res4 = await verifyTransactionWithBank('998877665544', 2500);
  if (res4.status === 'VERIFIED' && res4.bankAuthRef) {
    console.log('  ✅ PASSED:', res4.message);
    console.log('     Bank Auth Ref:', res4.bankAuthRef);
    passed++;
  } else {
    console.error('  ❌ FAILED:', res4);
  }

  // Test 5: Empty or blank UTR
  total++;
  console.log('\nTest 5: Empty UTR input handling...');
  const res5 = await verifyTransactionWithBank('', 100);
  if (res5.status === 'NOT_FOUND' && !res5.success) {
    console.log('  ✅ PASSED:', res5.message);
    passed++;
  } else {
    console.error('  ❌ FAILED:', res5);
  }

  console.log('\n----------------------------------------------------');
  console.log(`Results: ${passed} / ${total} tests passed.`);
  if (passed === total) {
    console.log('🎉 ALL BANK VERIFICATION TESTS PASSED SUCCESSFULLY!');
  } else {
    process.exit(1);
  }
}

runBankVerificationTests();
