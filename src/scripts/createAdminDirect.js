require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../config/database');

const createAdminDirect = async () => {
  try {
    await connectDB();
    
    console.log('📊 Database:', mongoose.connection.name);

    // Kiểm tra admin đã tồn tại chưa
    const existingAdmin = await User.findOne({ 
      email: 'lenguyenquynh.iuh@gmail.com' 
    });

    if (existingAdmin) {
      console.log('⚠️  User này đã tồn tại!');
      console.log('👤 Name:', existingAdmin.name);
      console.log('📧 Email:', existingAdmin.email);
      console.log('🔑 Role:', existingAdmin.role);

      if (existingAdmin.role !== 'admin') {
        console.log('\n🔄 Đang update role thành admin...');
        existingAdmin.role = 'admin';
        await existingAdmin.save();
        console.log('✅ Đã update role thành admin!');
      } else {
        console.log('✅ User này đã là admin!');
      }
    } else {
      console.log('👤 Tạo admin user mới...');
      
      const admin = await User.create({
        name: 'YuuLuckk',
        email: 'lenguyenquynh.iuh@gmail.com',
        password: 'admin123456', // Sẽ tự động hash
        role: 'admin',
        phone: '0123456789',
        isActive: true,
        emailVerified: true
      });

      console.log('✅ Đã tạo admin thành công!');
      console.log('📧 Email:', admin.email);
      console.log('🔑 Role:', admin.role);
    }

    await mongoose.connection.close();
    console.log('\n✅ Hoàn tất!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Lỗi:', error);
    process.exit(1);
  }
};

createAdminDirect();