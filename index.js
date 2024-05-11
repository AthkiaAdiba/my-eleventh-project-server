const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ui1n29x.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();


        const database = client.db("herittageHotel");
        const roomCollection = database.collection("rooms");
        const bookedRoomCollection = database.collection("bookedRooms");


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

        app.get('/bookedRoom/:email', async (req, res) => {
            const result = await bookedRoomCollection.find({ email: req.params.email }).toArray();
            console.log(result)
            res.send(result);
        });

        // add booked room
        app.post('/bookRoom', async (req, res) => {
            const bookRoom = req.body;
            // console.log(bookRoom)
            const result = await bookedRoomCollection.insertOne(bookRoom);
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
        await client.db("admin").command({ ping: 1 });
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