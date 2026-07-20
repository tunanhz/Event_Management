import mongoose from 'mongoose';
import { config } from '../config';
import { Contract, Withdrawal } from '../models';

async function run() {
  await mongoose.connect(config.mongodbUri);
  console.log('📦 Đã kết nối MongoDB:', config.mongodbUri);
  
  const contractsResult = await Contract.deleteMany({});
  console.log(`❌ Đã xoá ${contractsResult.deletedCount} hợp đồng.`);

  const withdrawalsResult = await Withdrawal.deleteMany({});
  console.log(`❌ Đã xoá ${withdrawalsResult.deletedCount} yêu cầu rút tiền.`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Truncate tài chính thất bại:', err);
  process.exit(1);
});
