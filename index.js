const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors({
    origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        "https://my-eleventh-project-c0e85.web.app",
        "https://my-eleventh-project-c0e85.firebaseapp.com"
    ],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ui1n29x.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


// middlewares
const logger = (req, res, next) => {
    console.log('log: info', req.method, req.url);
    next();
}

const verifyToken = (req, res, next) => {
    const token = req?.cookies?.token;
    // console.log('token in the middleware', token);
    // no token available
    if(!token){
        return res.status(401).send({message: 'Unauthorized access'})
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRETE, (err, decoded) => {
        if(err){
            return res.status(401).send({message: 'unauthorized access'})
        }
        req.user = decoded;
        next();
    })
}

const cookeOption = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" ? true : false,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
}


async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();


        const database = client.db("herittageHotel");
        const roomCollection = database.collection("rooms");
        const bookedRoomCollection = database.collection("bookedRooms");
        const commentCollection = database.collection("comments");

        
        // auth related api
        app.post('/jwt', logger, async (req, res) => {
            const user = req.body;
            console.log('user for token', user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRETE, { expiresIn: '1h' })

            res.cookie('token', token, cookeOption)
            .send({success: true})
                
        })

        app.post('/logout', async (req, res) => {
            const user = req.body;
            console.log('logging out', user)

            res
                .clearCookie('token', { ...cookeOption, maxAge: 0 })
                .send({ success: true })
        })

        // mongodb related api

        // get all data of rooms
        app.get('/rooms', async (req, res) => {
            const minPrice = parseInt(req.query.minPrice);
            const maxPrice = parseInt(req.query.maxPrice)
            // console.log(minPrice, maxPrice)

            const result = await roomCollection
                .find({ "price_per_night": { $gte: minPrice, $lte: maxPrice } }).toArray();

            res.send(result)
        });


        // get one room details by id
        app.get('/roomDetails/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id)
            const query = { _id: new ObjectId(id) }
            const result = await roomCollection.findOne(query)
            res.send(result);
        });


        // get one room details of booked room by id
        app.get('/bookedRoomDetails/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id)
            const query = { _id: new ObjectId(id) }
            const result = await bookedRoomCollection.findOne(query)
            res.send(result);
        });

        // get all bookings by email id
        app.get('/bookedRoom/:email', logger, verifyToken, async (req, res) => {
            console.log(req.params.email)
            console.log('token owner info', req.user)

            if(req.user.email !== req.params.email){
                return res.status(403).send({message: 'forbidden access'})
            }

            const result = await bookedRoomCollection.find({ email: req.params.email }).toArray();
            console.log(result)
            res.send(result);
        });


        // get comments by using room id of specific room
        app.get('/comments/:id', async (req, res) => {
            const result = await commentCollection.find({ room_id: req.params.id }).toArray();
            console.log(result)
            res.send(result);
        });


        // get all reviews
        app.get('/allReviews', async (req, res) => {
            const result = await commentCollection.find().sort({ "timestamp": -1 }).toArray();
            console.log(result)
            res.send(result);
        });


        // get all rooms for featured rooms section
        app.get('/featuredRooms', async (req, res) => {
            const result = await roomCollection.find().toArray();
            // console.log(result)
            res.send(result);
        });

        // add booked room
        app.post('/bookRoom', async (req, res) => {
            const bookRoom = req.body;
            // console.log(bookRoom)
            const result = await bookedRoomCollection.insertOne(bookRoom);
            res.send(result);
        });


        // add comment
        app.post('/addComment', async (req, res) => {
            const comment = req.body;
            console.log(comment)
            const result = await commentCollection.insertOne(comment);

            // update review count in comments collection
            const updateDoc = {
                $inc: { review_count: 1 },
            }
            const roomQuery = { _id: new ObjectId(comment.room_id) }
            const updateReviewCount = await roomCollection.updateOne(roomQuery, updateDoc)
            console.log(updateReviewCount)

            res.send(result);
        });

        // change availability status
        app.patch('/availability/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedAvailability = req.body;
            console.log(updatedAvailability);

            const updatedDoc = {
                $set: {
                    availability: updatedAvailability.availability
                }
            }
            const result = await roomCollection.updateOne(filter, updatedDoc)
            res.send(result)
        });


        // Update Date
        app.patch('/updateDate/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedDate = req.body;
            console.log(updatedDate);

            const updatedDoc = {
                $set: {
                    date: updatedDate.date
                }
            }
            const result = await bookedRoomCollection.updateOne(filter, updatedDoc)
            res.send(result)
        });


        // Delete a data of booking collection
        app.delete('/deleteBookedRoom/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await bookedRoomCollection.deleteOne(query)
            res.send(result);
        });



        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('My Eleventh server is running');
});

app.listen(port, () => {
    console.log(`My Eleventh server is running on : ${port}`)
})