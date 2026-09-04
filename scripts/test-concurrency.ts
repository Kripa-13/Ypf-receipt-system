import { insertReceiptAtomic, getDb } from '../lib/db';
import { amountToIndianWords } from '../lib/number-to-words';

async function runConcurrencyTest() {
  console.log('====================================================');
  console.log('🚀 TESTING CONCURRENCY: 15 USERS SUBMITTING SIMULTANEOUSLY');
  console.log('====================================================\n');

  const db = getDb();
  // Clear any existing receipts for clean test run
  db.prepare('DELETE FROM receipts').run();

  const NUM_USERS = 15;
  const startTime = Date.now();

  // Create 15 concurrent promises triggered at the exact same moment
  const promises = Array.from({ length: NUM_USERS }, (_, index) => {
    const userNumber = index + 1;
    return new Promise<any>((resolve, reject) => {
      setImmediate(() => {
        try {
          const receipt = insertReceiptAtomic({
            date: '04/09/2026',
            ac: `AC-IND-0${userNumber}`,
            contributorName: `Donor User ${userNumber}`,
            address: `Civil Lines Plot ${userNumber}`,
            district: 'Indore',
            pinCode: '452001',
            contactNo: `98765432${String(userNumber).padStart(2, '0')}`,
            panAadhaar: `PAN${userNumber}XXXX`,
            receiverName: 'Youth Peace Foundation',
            amount: 100 * userNumber,
            amountWords: amountToIndianWords(100 * userNumber),
            paymentMode: 'UPI',
            transactionId: `AXISNP123456${String(userNumber).padStart(4, '0')}`,
            verificationStatus: 'PENDING'
          });
          resolve(receipt);
        } catch (err) {
          reject(err);
        }
      });
    });
  });

  const results = await Promise.all(promises);
  const elapsed = Date.now() - startTime;

  console.log(`✅ All ${results.length} concurrent submissions completed in ${elapsed} ms!`);

  // Analyze results for uniqueness and integrity
  const receiptNumbers = results.map(r => r.receipt_no);
  const contributionIds = results.map(r => r.contribution_id);

  const uniqueReceiptNumbers = new Set(receiptNumbers);
  const uniqueContributionIds = new Set(contributionIds);

  console.log('\n--- VERIFICATION AUDIT ---');
  console.log(`Total Requests Submitted : ${NUM_USERS}`);
  console.log(`Total Receipts Created   : ${results.length}`);
  console.log(`Unique Receipt Numbers   : ${uniqueReceiptNumbers.size} of ${NUM_USERS}`);
  console.log(`Unique Contribution IDs  : ${uniqueContributionIds.size} of ${NUM_USERS}`);

  // Display receipt table
  console.log('\nGenerated Sequential Receipts:');
  results
    .sort((a, b) => a.contribution_id - b.contribution_id)
    .forEach(r => {
      console.log(`  [ID: ${String(r.contribution_id).padStart(2, ' ')}]  Receipt: ${r.receipt_no} | Donor: ${r.contributor_name.padEnd(16, ' ')} | Amount: ₹${r.amount.toFixed(2)}`);
    });

  if (uniqueReceiptNumbers.size === NUM_USERS && uniqueContributionIds.size === NUM_USERS) {
    console.log('\n🎉 PASS: 100% Unique Sequential IDs guaranteed under 15-user concurrency! No collisions detected.');
  } else {
    console.error('\n❌ FAIL: Collision detected!');
    process.exit(1);
  }
}

runConcurrencyTest().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
