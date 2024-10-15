const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();
const port = 3000;

//secret key for JWT
const JWT_SECRET = '01720d1b4386fa2a658d1a722adabca682c6936c7335c1ed50704b096ec990450bcd7b2bb399d25670186f31f1e63c99ebcd8f1bd3111c6f948f33f556cf3aa9';

//mongoDB connection string
const uri = 'mongodb+srv://mkh6113:ZQFVU6i92PwbueNd@cluster0.uc1iz.mongodb.net/';
const client = new MongoClient(uri, { useUnifiedTopology: true });

// Connect to MongoDB once when server starts
let db;
client.connect()
  .then(() => {
    db = client.db('db_groceryshoppingassistant');
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

app.use(cors()); // Enable CORS to allow React Native to connect to the server
app.use(express.json()); // To parse incoming JSON requests

// Endpoint to insert product data into MongoDB
app.post('/add-product', async (req, res) => {
  try {
    const collection = db.collection('db_productdata');
    const result = await collection.insertOne(req.body);
    res.status(200).send({ message: 'Product added successfully', id: result.insertedId });
  } catch (error) {
    res.status(500).send({ error: 'Error adding product', details: error.message });
  }
});

// Endpoint to fetch product data by barcode from MongoDB
app.get('/get-product/:barcode', async (req, res) => {
  try {
    const collection = db.collection('db_productdata');
    const product = await collection.findOne({ _id: req.params.barcode });
    if (product) {
      res.status(200).json(product);
    } else {
      res.status(404).send({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).send({ error: 'Error fetching product', details: error.message });
  }
});

// Endpoint to fetch product data by barcode from MongoDB
app.get('/get-products', async (req, res) => {
  try {
    const collection = db.collection('db_productdata');
    
    const products = await collection.find({}).toArray(); 

    if (products.length > 0) {
      res.status(200).json(products);
    } else {
      res.status(404).send({ message: 'No products found' });
    }
  } catch (error) {
    res.status(500).send({ error: 'Error fetching products', details: error.message });
  }
});

// Endpoint to insert user data into MongoDB
app.post('/register', async (req, res) => {
  const { userID, password, firstname, lastname, email, gender, dob } = req.body;

  try {
    const usersCollection = db.collection('db_userdata');

    // Check if the user already exists
    const existingUser = await usersCollection.findOne({ userID });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Hash the password before saving it to the database
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user into the database
    const newUser = { userID, password: hashedPassword, firstname, lastname, email, gender, dob };
    await usersCollection.insertOne(newUser);

    res.status(201).json({ success: true, message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error registering user', error: error.message });
  }
});

// Endpoint to validate user from MongoDB
app.post('/login', async (req, res) => {
  const { userID, password } = req.body;

  try {
    const usersCollection = db.collection('db_userdata');

    // Find the user by userID
    const user = await usersCollection.findOne({ userID });
    if (!user) {
      return res.status(404).send('User not found'); // Send error response
    }

    // Compare the provided password with the hashed password in the database
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).send('Invalid password'); // Send error response
    }

    // Generate a JWT token
    const token = jwt.sign({ userID: user.userID }, process.env.JWT_SECRET || JWT_SECRET, { expiresIn: '1h' });

    // Send the token to the client
    res.status(200).json({ token });
  } catch (error) {
    console.error(error); // Log the error for debugging purposes
    res.status(500).send('Error logging in');
  }
});

// Middleware to authenticate requests, for logged user to not login again when restarting the app
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]; // Get token from 'Bearer token'

  if (!token) return res.status(401).send('Access denied, no token provided');

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).send('Invalid token');
    req.user = user; // Attach user info to the request
    next();
  });
};

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
