import mongoose from 'mongoose';
import { config } from '../config';
import { Contract, Withdrawal } from '../models';

async function run() {
  await mongoose.connect(config.mongodbUri);
  console.log('Connected');
  const contracts = await Contract.find().lean();
  console.log('Contracts in DB:', contracts.length);
  contracts.forEach((c: any) => console.log('Contract:', c._id, c.status, c.documentName));

  const withdrawals = await Withdrawal.find().lean();
  console.log('Withdrawals in DB:', withdrawals.length);
  withdrawals.forEach((w: any) => console.log('Withdrawal:', w._id, w.status, w.amount));
  
  await mongoose.disconnect();
}
run().catch(console.error);
