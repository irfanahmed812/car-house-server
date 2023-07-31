const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const fileUpload = require('express-fileupload');
const Buffer = require('buffer/').Buffer;
const cors = require('cors');
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();
const port = process.env.PORT || 5000;

// midleware
app.use(cors());
// own body-parser
app.use(express.json());
app.use(fileUpload())

// console.log(process.env.STRIPE_SECRET_KEY);


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pcpwejc.mongodb.net/?retryWrites=true&w=majority`;

// console.log(uri);

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
        const carsCollection = client.db('car-house').collection('all-cars');
        const ordersCollection = client.db('car-house').collection('orders');
        const usersCollection = client.db('car-house').collection('users');
        const usersProfileImgCollection = client.db('car-house').collection('user-image');
        const reviewsCollection = client.db('car-house').collection('reviews');
        const paymentsCollection = client.db('car-house').collection('payments');

        // get all cars
        app.get('/cars', async (req, res) => {
            const query = {};
            const cars = await carsCollection.find(query).toArray();
            res.send(cars)
        });

        // get single id
        app.get('/cars/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await carsCollection.findOne(filter);
            res.send(result)
        });

        // cars delete
        app.delete('/cars/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await carsCollection.deleteOne(query);
            res.send(result);
        });

        // post cars by admin
        app.post('/cars', async (req, res) => {
            const title = req.body.title;
            const brand = req.body.brand;
            const price = req.body.price;
            const description = req.body.description;
            const img = req.files.img;
            // console.log(price, img, description, brand, title);

            const imgData = img.data;
            const encodedImg = imgData.toString('base64');
            const imgBuffer = Buffer.from(encodedImg, 'base64');
            const car = {
                title,
                brand,
                price,
                description,
                img: imgBuffer
            }

            const result = await carsCollection.insertOne(car);
            res.send(result);
        })


        // order post by user
        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await ordersCollection.insertOne(order);
            res.send(result)
        })

        // order get for admin
        app.get('/orders/all', async (req, res) => {
            const query = {};
            const orders = await ordersCollection.find(query).toArray();
            res.send(orders)
        })

        // order query by signle email
        app.get('/orders', async (req, res) => {
            const email = req.query.email
            const query = { email: email }
            const cursor = ordersCollection.find(query);
            const result = await cursor.toArray();
            // console.log(result);
            res.send(result)
        })

        // delete order 
        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await ordersCollection.deleteOne(query);
            res.send(result);
        });

        // get order by id (for payment)
        app.get('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await ordersCollection.findOne(query);
            res.send(result);
        });

        // approved by admin
        app.put('/orders/approved/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const option = { upsert: true };
            const updateDoc = {
                $set: {
                    status: 'approved'
                }
            };
            const result = await ordersCollection.updateOne(filter, updateDoc, option);
            res.send(result);
        })

        // import all user from firebase on database
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })

        // imported user get
        app.get('/users', async (req, res) => {
            const query = {};
            const users = await usersCollection.find(query).toArray();
            res.send(users);
        })

        // user update role for admin
        app.put('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const option = { upsert: true };
            const updateDoc = {
                $set: {
                    role: 'admin'
                }
            };
            const result = await usersCollection.updateOne(filter, updateDoc, option);
            res.send(result);
        })

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' })
        })

        // delete user by admin
        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        });

        // user profile upload
        app.post('/userprofile', async (req, res) => {
            const img = req.files.img;
            const email = req.body.email;
            const imgData = img.data;
            const encodedImg = imgData.toString('base64');
            const imgBuffer = Buffer.from(encodedImg, 'base64');

            const profileImage = {
                image: imgBuffer,
                email
            }

            const result = await usersProfileImgCollection.insertOne(profileImage);
            res.send(result)
        })

        // user profile get
        app.get('/userprofile/all', async (req, res) => {
            const query = {};
            const result = await usersProfileImgCollection.find(query).toArray();
            res.send(result);
        })

        // user profile get signle email
        app.get('/userprofile', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const cursor = usersProfileImgCollection.find(query);
            const result = await cursor.toArray();
            // console.log(result);
            res.send(result)
        })



        // reviews get
        app.get('/reviews', async (req, res) => {
            const query = {};
            const result = await reviewsCollection.find(query).toArray();
            res.send(result)
        })

        // reviews post
        app.post('/reviews', async (req, res) => {
            const reviews = req.body;
            const result = await reviewsCollection.insertOne(reviews);
            res.send(result);

        })

        // payment system start
        app.post('/create-payment-intent', async (req, res) => {
            const order = req.body;
            const price = order.price;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: "usd",
                amount: amount,
                "payment_method_types": [
                    "card"
                ],
            })
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        })

        // payment details post on database
        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const id = payment.orderId;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId,
                }
            }

            const updatedResult = await ordersCollection.updateOne(filter, updatedDoc);

            res.send(result)
        })



    } finally {

    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('server was running')
})

app.listen(port, () => {
    console.log(`Second node server run on: ${port}`);
})
