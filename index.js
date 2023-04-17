const express = require('express');
const cors = require('cors');
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

async function run() {
    try {
        await client.connect();
        // await client.db("shoppableData").command({ ping: 1 });
        const productsCollection = client.db('shoppableGroceryData').collection('products');
        const orderCollection = client.db('shoppableGroceryData').collection('orders');

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