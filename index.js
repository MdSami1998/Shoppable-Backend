const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;

const app = express();

// middleware
app.use(cors())
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gsxjesa.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized access' })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {
        await client.connect();
        // await client.db("shoppableData").command({ ping: 1 });
        const productsCollection = client.db('shoppableGroceryData').collection('products');
        const orderCollection = client.db('shoppableGroceryData').collection('orders');
        const userCollection = client.db('shoppableGroceryData').collection('users');

        // get all products API
        app.get('/products', async (req, res) => {
            const query = {};
            const cursor = productsCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);
        });

        // get single products API 
        app.get('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const product = await productsCollection.findOne(query);
            res.send(product);
        });

        // API for ordered product
        app.post('/order', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        })

        // Api for updated quantity of order
        app.put('/updateProduct/:id', async (req, res) => {
            const id = req.params.id;
            const updatedProduct = req.body;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: updatedProduct,
            };
            const result = await productsCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })

        // (post/add) or update(if exists) user api
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' })
            res.send({ result, token });
        })

        // get all my orders collection using email query
        app.get('/orders', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email === decodedEmail) {
                const query = { email: email };
                const cursor = orderCollection.find(query);
                const orders = await cursor.toArray();
                return res.send(orders);
            }
            else {
                return res.status(403).send({ message: 'Forbidden access' })
            }
        })

        // GET MEMBER DATA BY QUERY FOR PROFILE UPDATE
        app.get('/member', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const member = await userCollection.findOne(query);
            res.send(member);
        })

        // update profile data
        app.put('/member/:email', async (req, res) => {
            const email = req.params.email;
            const updatedProfile = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: updatedProfile,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })

        // get all users
        app.get('/users', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        })

        // make admin API
        app.put('/user/admin/:email', verifyJWT,  async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                const filter = { email: email };
                const updateDoc = {
                    $set: { role: 'admin' },
                };
                const result = await userCollection.updateOne(filter, updateDoc);
                res.send(result);
            }
            else {
                res.status(403).send({ message: 'Forbidden Access' });
            }
        })

        // verify admin api
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin });
        })

    } finally {

    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Running Server')
})

app.listen(port, () => {
    console.log("Listening Port 5000")
})