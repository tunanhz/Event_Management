const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const seedStaff = async () => {
  await mongoose.connect('mongodb://localhost:27017/event_management');

  const User = mongoose.connection.model('User', new mongoose.Schema({
    fullName: String,
    email: { type: String, unique: true },
    passwordHash: String,
    role: String,
    accountStatus: String,
    phone: String,
    createdAt: Date,
    updatedAt: Date,
  }, { timestamps: true }));

  try {
    const passwordHash = await bcrypt.hash('Staff@123', 10);

    // Check if exists
    let staff = await User.findOne({ email: 'staff@eventbox.vn' });
    if (staff) {
      staff.fullName = 'Trần Thị Staff';
      staff.passwordHash = passwordHash;
      staff.role = 'STAFF';
      staff.accountStatus = 'ACTIVE';
      staff.phone = '0901000004';
      if (!staff.createdAt) staff.createdAt = new Date('2026-01-04T00:00:00.000Z');
      await staff.save();
      console.log('Updated staff user:', staff._id.toString());
    } else {
      staff = await User.create({
        fullName: 'Trần Thị Staff',
        email: 'staff@eventbox.vn',
        passwordHash,
        role: 'STAFF',
        accountStatus: 'ACTIVE',
        phone: '0901000004',
        createdAt: new Date('2026-01-04T00:00:00.000Z'),
      });
      console.log('Created staff user:', staff._id.toString());
    }

    // Verify password
    const ok = await bcrypt.compare('Staff@123', staff.passwordHash);
    console.log('Password check (Staff@123):', ok ? 'OK ✓' : 'FAIL ✗');

    console.log('\nCredentials:');
    console.log('  Email:    staff@eventbox.vn');
    console.log('  Password: Staff@123');
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
};

seedStaff();
