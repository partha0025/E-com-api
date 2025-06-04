// ecommerce_backend_api/index.js

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// MongoDB Connection
mongoose.connect('mongodb://127.0.0.1:27017/ecommerce_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// Schemas and Models

const ProductSchema = new mongoose.Schema({
  name: String,
  price: Number,
  category: String,
  stock: Number,
  discount: Number, // percentage
});

const CategorySchema = new mongoose.Schema({
  name: String,
  description: String,
});

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
});

const CartSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  items: [
    {
      productId: mongoose.Schema.Types.ObjectId,
      quantity: Number,
    },
  ],
});

const OrderSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  items: [
    {
      productId: mongoose.Schema.Types.ObjectId,
      quantity: Number,
      priceAtPurchase: Number,
    },
  ],
  total: Number,
  createdAt: { type: Date, default: Date.now },
});

const Product = mongoose.model('Product', ProductSchema);
const Category = mongoose.model('Category', CategorySchema);
const User = mongoose.model('User', UserSchema);
const Cart = mongoose.model('Cart', CartSchema);
const Order = mongoose.model('Order', OrderSchema);

// Routes

// Products CRUD
app.post('/products', async (req, res) => {
  const product = new Product(req.body);
  await product.save();
  res.status(201).send(product);
});

app.get('/products', async (req, res) => {
  const products = await Product.find();
  res.send(products);
});

app.put('/products/:id', async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.send(product);
});

app.delete('/products/:id', async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.send({ message: 'Product deleted' });
});

// Categories CRUD
app.post('/categories', async (req, res) => {
  const category = new Category(req.body);
  await category.save();
  res.status(201).send(category);
});

app.get('/categories', async (req, res) => {
  const categories = await Category.find();
  res.send(categories);
});

// Cart operations
app.post('/cart/:userId/add', async (req, res) => {
  const { productId, quantity } = req.body;
  let cart = await Cart.findOne({ userId: req.params.userId });

  if (!cart) {
    cart = new Cart({ userId: req.params.userId, items: [] });
  }

  const existingItem = cart.items.find((item) => item.productId.toString() === productId);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.items.push({ productId, quantity });
  }

  await cart.save();
  res.send(cart);
});

// Checkout and Order Creation
app.post('/order/:userId', async (req, res) => {
  const cart = await Cart.findOne({ userId: req.params.userId });
  if (!cart) return res.status(400).send('Cart not found');

  let total = 0;
  const orderItems = await Promise.all(
    cart.items.map(async (item) => {
      const product = await Product.findById(item.productId);
      const discountedPrice = product.price * (1 - product.discount / 100);
      total += discountedPrice * item.quantity;
      return {
        productId: item.productId,
        quantity: item.quantity,
        priceAtPurchase: discountedPrice,
      };
    })
  );

  const order = new Order({
    userId: req.params.userId,
    items: orderItems,
    total,
  });

  await order.save();
  await Cart.deleteOne({ userId: req.params.userId });

  res.status(201).send(order);
});

// Start Server
app.listen(4000, () => console.log('E-Commerce API running on port 4000'));
