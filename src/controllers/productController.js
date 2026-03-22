const Product = require("../models/Product");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const cloudinary = require("../config/cloudinary");
const { searchProductsAdvanced } = require("../services/productSearchEngine");
const { asyncHandler } = require("../middleware/errorHandler");

const resolveLocalPathFromUrl = (urlPath) => {
    if (!urlPath || typeof urlPath !== "string") return null;
    if (!urlPath.startsWith("/uploads/")) return null;
    const relativeUploadPath = urlPath.replace(/^\/+/, "");
    return path.join(__dirname, "../../", relativeUploadPath);
};

const deleteLocalImageByUrl = (urlPath) => {
    const filePath = resolveLocalPathFromUrl(urlPath);
    if (!filePath) return;

    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (error) {
        console.error("Error deleting local image:", error.message);
    }
};

const uploadProductImageToCloudinary = (file) =>
    new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream({
                folder: "electronic-selling/products",
                public_id: `product-${Date.now()}-${uuidv4()}`,
                resource_type: "image",
            },
            (error, result) => {
                if (error) return reject(error);
                return resolve(result);
            },
        );

        uploadStream.end(file.buffer);
    });

const deleteProductImage = async(image) => {
    if (!image) return;

    // Legacy local images from previous upload flow
    if (image.url && image.url.startsWith("/uploads/")) {
        deleteLocalImageByUrl(image.url);
        return;
    }

    // Cloudinary images
    if (
        image.public_id &&
        typeof image.url === "string" &&
        image.url.includes("res.cloudinary.com")
    ) {
        try {
            await cloudinary.uploader.destroy(image.public_id, {
                resource_type: "image",
            });
        } catch (error) {
            console.error("Error deleting Cloudinary image:", error.message);
        }
    }
};

const normalizeBodyImages = (images) => {
    if (!Array.isArray(images)) return [];

    return images
        .map((image) => {
            if (typeof image === "string") {
                return { url: image, public_id: uuidv4() };
            }
            return image;
        })
        .filter((image) => {
            const url = image && image.url;
            return typeof url === "string" && /^https?:\/\//i.test(url);
        });
};

// @desc    Get all products with filters, sorting, pagination
// @route   GET /api/products
// @access  Public
exports.getProducts = asyncHandler(async(req, res) => {
    const {
        category,
        search,
        minPrice,
        maxPrice,
        brand,
        sort = "-createdAt",
        page = 1,
        limit = 12,
    } = req.query;

    // Build query
    const query = { $or: [{ isActive: true }, { isActive: { $exists: false } }] };

    // Category filter
    if (category && category !== "all") {
        query.category = category;
    }

    // Brand filter
    if (brand) {
        query.brand = new RegExp(brand, "i");
    }

    // Price range filter
    if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = Number(minPrice);
        if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Search filter
    if (search) {
        query.$text = { $search: search };
    }

    // Execute query
    const products = await Product.find(query)
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select("-reviews");

    // Get total count for pagination
    const count = await Product.countDocuments(query);

    res.json({
        success: true,
        products,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(count / limit),
            totalProducts: count,
        },
    });
});

// @desc    Advanced product search (fuzzy + relevance + synonyms)
// @route   GET /api/products/advanced-search
// @access  Public
exports.getProductsAdvancedSearch = asyncHandler(async(req, res) => {
    const {
        search = "",
            q = "",
            category,
            brand,
            minPrice,
            maxPrice,
            min_price,
            max_price,
            sort = "relevance",
            page = 1,
            limit = 12,
    } = req.query;

    const dbQuery = {
        $or: [{ isActive: true }, { isActive: { $exists: false } }],
    };

    if (category && category !== "all") {
        dbQuery.category = category;
    }

    if (brand) {
        dbQuery.brand = new RegExp(brand, "i");
    }

    const safeMinPrice =
        minPrice !== undefined && minPrice !== null && minPrice !== "" ?
        minPrice :
        min_price;
    const safeMaxPrice =
        maxPrice !== undefined && maxPrice !== null && maxPrice !== "" ?
        maxPrice :
        max_price;

    if (safeMinPrice || safeMaxPrice) {
        dbQuery.price = {};
        if (safeMinPrice) dbQuery.price.$gte = Number(safeMinPrice);
        if (safeMaxPrice) dbQuery.price.$lte = Number(safeMaxPrice);
    }

    const candidates = await Product.find(dbQuery).select("-reviews").lean();

    const result = searchProductsAdvanced(candidates, {
        search: search || q,
        sort,
        page: Number(page),
        limit: Number(limit),
        category,
        brand,
        minPrice: safeMinPrice,
        maxPrice: safeMaxPrice,
    });

    res.json({
        success: true,
        products: result.items,
        pagination: result.pagination,
    });
});

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
exports.getProductById = asyncHandler(async(req, res) => {
    const product = await Product.findById(req.params.id)
        .populate("reviews.user", "name avatar")
        .populate("seller", "name email");

    if (!product) {
        return res.status(404).json({
            success: false,
            message: "Product not found",
        });
    }

    // Increment views
    product.views += 1;
    await product.save({ validateBeforeSave: false });

    res.json({
        success: true,
        product,
    });
});

// @desc    Create new product
// @route   POST /api/products
// @access  Private/Admin
exports.createProduct = asyncHandler(async(req, res) => {
    const {
        name,
        description,
        price,
        category,
        brand,
        stock,
        specifications,
        features,
    } = req.body;

    // Handle images - either from file upload or JSON body
    let images = [];

    // If files are uploaded (multipart/form-data)
    if (req.files && req.files.length > 0) {
        const uploadedImages = await Promise.all(
            req.files.map((file) => uploadProductImageToCloudinary(file)),
        );

        images = uploadedImages.map((uploaded) => ({
            url: uploaded.secure_url,
            public_id: uploaded.public_id,
        }));
    }
    // If images are provided in JSON body
    else if (req.body.images && Array.isArray(req.body.images)) {
        images = normalizeBodyImages(req.body.images);
    }

    if (images.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Please upload at least one product image or provide valid image URLs",
        });
    }

    // Parse specifications if sent as JSON string
    let parsedSpecifications = {};
    if (specifications) {
        try {
            parsedSpecifications =
                typeof specifications === "string" ?
                JSON.parse(specifications) :
                specifications;
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: "Invalid specifications format",
            });
        }
    }

    // Parse features if sent as JSON string
    let parsedFeatures = [];
    if (features) {
        try {
            parsedFeatures =
                typeof features === "string" ? JSON.parse(features) : features;
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: "Invalid features format",
            });
        }
    }

    const product = await Product.create({
        name,
        description,
        price,
        category,
        brand,
        stock,
        images,
        specifications: parsedSpecifications,
        features: parsedFeatures,
        seller: req.user._id,
    });

    res.status(201).json({
        success: true,
        message: "Product created successfully",
        product,
    });
});

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
exports.updateProduct = asyncHandler(async(req, res) => {
    let product = await Product.findById(req.params.id);

    if (!product) {
        return res.status(404).json({
            success: false,
            message: "Product not found",
        });
    }

    // Handle image updates
    if (req.files && req.files.length > 0) {
        await Promise.all(product.images.map((image) => deleteProductImage(image)));

        const uploadedImages = await Promise.all(
            req.files.map((file) => uploadProductImageToCloudinary(file)),
        );

        product.images = uploadedImages.map((uploaded) => ({
            url: uploaded.secure_url,
            public_id: uploaded.public_id,
        }));

        req.body.images = product.images;
    }

    // Parse specifications if provided
    if (req.body.specifications) {
        try {
            req.body.specifications =
                typeof req.body.specifications === "string" ?
                JSON.parse(req.body.specifications) :
                req.body.specifications;
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: "Invalid specifications format",
            });
        }
    }

    // Parse features if provided
    if (req.body.features) {
        try {
            req.body.features =
                typeof req.body.features === "string" ?
                JSON.parse(req.body.features) :
                req.body.features;
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: "Invalid features format",
            });
        }
    }

    // Update product
    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });

    res.json({
        success: true,
        message: "Product updated successfully",
        product,
    });
});

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
exports.deleteProduct = asyncHandler(async(req, res) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
        return res.status(404).json({
            success: false,
            message: "Product not found",
        });
    }

    await Promise.all(product.images.map((image) => deleteProductImage(image)));

    await product.deleteOne();

    res.json({
        success: true,
        message: "Product deleted successfully",
    });
});

// @desc    Add product review
// @route   POST /api/products/:id/reviews
// @access  Private
exports.addReview = asyncHandler(async(req, res) => {
    const { rating, comment } = req.body;

    const product = await Product.findById(req.params.id);

    if (!product) {
        return res.status(404).json({
            success: false,
            message: "Product not found",
        });
    }

    // Check if user already reviewed
    const alreadyReviewed = product.reviews.find(
        (review) => review.user.toString() === req.user._id.toString(),
    );

    if (alreadyReviewed) {
        return res.status(400).json({
            success: false,
            message: "You have already reviewed this product",
        });
    }

    const review = {
        user: req.user._id,
        name: req.user.name,
        rating: Number(rating),
        comment,
    };

    product.reviews.push(review);
    product.numReviews = product.reviews.length;
    product.rating =
        product.reviews.reduce((acc, item) => item.rating + acc, 0) /
        product.reviews.length;

    await product.save();

    res.status(201).json({
        success: true,
        message: "Review added successfully",
    });
});

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
exports.getFeaturedProducts = asyncHandler(async(req, res) => {
    const products = await Product.find({
            isActive: true,
            isFeatured: true,
        })
        .limit(8)
        .select("-reviews");

    res.json({
        success: true,
        products,
    });
});

// @desc    Get top rated products
// @route   GET /api/products/top-rated
// @access  Public
exports.getTopRated = asyncHandler(async(req, res) => {
    const products = await Product.find({ isActive: true })
        .sort({ rating: -1, numReviews: -1 })
        .limit(10)
        .select("-reviews");

    res.json({
        success: true,
        products,
    });
});