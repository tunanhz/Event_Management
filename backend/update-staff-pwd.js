const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/event_management').then(async () => {
  try {
    const res = await mongoose.connection.db.collection('users').updateOne(
      { email: 'staff@eventbox.vn' },
      { $set: { passwordHash: '$2b$10$/OQ8QIBKINU30Kh57pR8.u8w81OM7hXafjlUN/Fvf08rs5SFDc5pm' } }
    );
    console.log('Update result:', res);
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
});
