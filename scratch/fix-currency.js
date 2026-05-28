const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function fixCurrency() {
  console.log('Starting currency update to AUD...');
  
  // Update retreats
  const retreats = await db.collection('retreats').get();
  for (const doc of retreats.docs) {
    await doc.ref.update({ currency: 'AUD' });
    console.log(`Updated retreat ${doc.id} to AUD`);
  }

  // Update courses
  const courses = await db.collection('courses').get();
  for (const doc of courses.docs) {
    await doc.ref.update({ currency: 'AUD' });
    console.log(`Updated course ${doc.id} to AUD`);
  }

  console.log('Currency update complete.');
  process.exit(0);
}

fixCurrency().catch(err => {
  console.error('Update failed:', err);
  process.exit(1);
});
