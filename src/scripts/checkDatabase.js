require("dotenv").config();
const mongoose = require("mongoose");

const checkDatabase = async () => {
  try {
    console.log("🔗 Connecting to MongoDB...\n");

    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log("✅ CONNECTED!");
    console.log("📊 Database:", conn.connection.name);
    console.log("🌐 Host:", conn.connection.host);

    // Liệt kê collections
    console.log('\n📦 COLLECTIONS in "' + conn.connection.name + '":');
    const collections = await conn.connection.db.listCollections().toArray();

    if (collections.length === 0) {
      console.log("   ⚠️  Database rỗng! Không có collection nào.");
    } else {
      for (const col of collections) {
        const count = await conn.connection.db
          .collection(col.name)
          .countDocuments();
        console.log(`   - ${col.name}: ${count} documents`);
      }
    }

    // Kiểm tra chi tiết collection products
    console.log('\n🔍 CHI TIẾT COLLECTION "products":');
    const productsCollection = conn.connection.db.collection("products");
    const productsCount = await productsCollection.countDocuments();

    console.log(`   📊 Total documents: ${productsCount}`);

    if (productsCount > 0) {
      console.log("\n📄 5 products đầu tiên:");
      const sampleProducts = await productsCollection
        .find({})
        .limit(5)
        .toArray();
      sampleProducts.forEach((p, i) => {
        console.log(
          `   ${i + 1}. ${p.name} - ${p.price?.toLocaleString("vi-VN")}đ`,
        );
      });
    } else {
      console.log('   ❌ Collection "products" RỖNG!');
    }

    // Kiểm tra collection users
    console.log('\n👥 CHI TIẾT COLLECTION "users":');
    const usersCollection = conn.connection.db.collection("users");
    const usersCount = await usersCollection.countDocuments();
    console.log(`   📊 Total documents: ${usersCount}`);

    if (usersCount > 0) {
      const users = await usersCollection.find({}).toArray();
      users.forEach((u, i) => {
        console.log(`   ${i + 1}. ${u.name} - ${u.email} (${u.role})`);
      });
    } else {
      console.log('   ❌ Collection "users" RỖNG!');
    }

    await mongoose.connection.close();
    console.log("\n✅ Hoàn tất!\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi:", error);
    process.exit(1);
  }
};

checkDatabase();
