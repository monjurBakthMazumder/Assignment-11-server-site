const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  })
);
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.NAME}:${process.env.PASS}@cluster0.ib5iccz.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const foodCollection = client.db("foodDB").collection("food");
    const requestFoodCollection = client.db("foodDB").collection("requestFood");
    //food related api
    app.get("/foods", async (req, res) => {
      const result = await foodCollection.find().toArray();
      res.send(result);
    });
    app.get("/manage-foods", async (req, res) => {
      const email = req.query.email;
      const cursor = { donatorEmail: email };
      const result = await foodCollection.find(cursor).toArray();
      res.send(result);
    });

    app.get("/feature-foods", async (req, res) => {
      const result = await foodCollection
        .find()
        .sort({ quantity: -1 })
        .skip(0)
        .limit(6)
        .toArray();
      res.send(result);
    });

    app.get("/foods/:id", async (req, res) => {
      const id = req.params;
      const cursor = { _id: new ObjectId(id) };
      const result = await foodCollection.findOne(cursor);
      res.send(result);
    });

    app.post("/foods", async (req, res) => {
      try {
        const food = req.body;
        const result = await foodCollection.insertOne(food);
        res.send(result);
      } catch (err) {
        console.log(err.massage);
      }
    });

    app.put("/foods/:id", async (req, res) => {
      const food = req.body;
      const id = req.params;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateFood = {
        $set: {
          foodName : food.foodName,
          foodImg : food.foodImg,
          quantity : food.quantity,
          pickupLocation : food.pickupLocation,
          expiredDate : food.expiredDate,
          additionalInformation : food.additionalInformation,
        },
      };
      const result = await foodCollection.updateOne(filter, updateFood, options);
      res.send(result);
    });

    app.delete("/foods/:id", async (req, res) => {
      const id = req.params;
      const cursor = { _id: new ObjectId(id) };
      const result = await foodCollection.deleteOne(cursor);
      res.send(result);
    });

    // request food related api
    app.post('/request-food', async (req, res) =>{
      const food = req.body
      const result = await requestFoodCollection.insertOne(food);
      res.send(result);
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Foodies server");
});

app.listen(port, () => {
  console.log(`foodies server is running on port ${port}`);
});
