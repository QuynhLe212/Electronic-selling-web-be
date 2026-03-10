const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide product name"],
      trim: true,
      maxlength: [200, "Name cannot exceed 200 characters"],
    },
    slug: {
      type: String,
      unique: true,
      // ✅ REMOVED: required - vì sẽ tự động tạo
    },
    description: {
      type: String,
      required: [true, "Please provide product description"],
    },
    price: {
      type: Number,
      required: [true, "Please provide product price"],
      min: [0, "Price cannot be negative"],
    },
    originalPrice: {
      type: Number,
      min: [0, "Original price cannot be negative"],
    },
    category: {
      type: String,
      required: [true, "Please select product category"],
      enum: {
        values: [
          "Laptop",
          "Phone",
          "Tablet",
          "Accessory",
          "Monitor",
          "PC",
          "Gaming",
          "Other",
        ],
        message: "Please select correct category",
      },
    },
    brand: {
      type: String,
      trim: true,
    },
    stock: {
      type: Number,
      required: [true, "Please provide product stock"],
      min: [0, "Stock cannot be negative"],
      default: 0,
    },
    sold: {
      type: Number,
      default: 0,
      min: 0,
    },
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        public_id: {
          type: String,
          required: true,
        },
      },
    ],
    specifications: {
      type: Map,
      of: String,
    },
    features: [String],
    rating: {
      type: Number,
      default: 0,
      min: [0, "Rating cannot be less than 0"],
      max: [5, "Rating cannot be more than 5"],
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    reviews: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        rating: {
          type: Number,
          required: true,
          min: 1,
          max: 5,
        },
        comment: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ✅ Function để tạo slug từ string
function slugify(text) {
  const from =
    "àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ·/_,:;";
  const to =
    "aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd------";

  const newText = text
    .split("")
    .map((char) => {
      const index = from.indexOf(char);
      return index !== -1 ? to[index] : char;
    })
    .join("");

  return newText
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars
    .replace(/\-\-+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, ""); // Trim - from end of text
}

// ✅ Pre-save hook để tự động tạo slug
productSchema.pre("save", function (next) {
  if (!this.slug || this.isModified("name")) {
    let baseSlug = slugify(this.name);
    this.slug = baseSlug;
  }
  next();
});

// ✅ Pre-insertMany hook để tạo slug cho bulk insert
productSchema.pre("insertMany", function (next, docs) {
  if (docs && docs.length) {
    docs.forEach((doc, index) => {
      if (!doc.slug) {
        let baseSlug = slugify(doc.name);
        // Thêm số thứ tự để tránh trùng lặp khi seed
        doc.slug = `${baseSlug}-${Date.now()}-${index}`;
      }
    });
  }
  next();
});

// Indexes
productSchema.index({ name: "text", description: "text" });
productSchema.index({ category: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });
productSchema.index({ sold: -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ slug: 1 }, { unique: true });

// Virtual for discount percentage
productSchema.virtual("discountPercent").get(function () {
  if (this.originalPrice && this.originalPrice > this.price) {
    return Math.round(
      ((this.originalPrice - this.price) / this.originalPrice) * 100,
    );
  }
  return 0;
});

// Virtual for in stock status
productSchema.virtual("inStock").get(function () {
  return this.stock > 0;
});

// Static method to get categories
productSchema.statics.getCategories = function () {
  return this.schema.path("category").enumValues;
};

// Static method to get featured products
productSchema.statics.getFeatured = function (limit = 6) {
  return this.find({ isFeatured: true, isActive: true, stock: { $gt: 0 } })
    .sort({ rating: -1, sold: -1 })
    .limit(limit);
};

module.exports = mongoose.model("Product", productSchema);
