const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(
  cors({
    origin: ["http://localhost:5173",
     "http://localhost:5174",
     "https://assignment-11-f45c1.web.app",
     "https://assignment-11-f45c1.firebaseapp.com"
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

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

//  verify token 
const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  if(!token) {
    return res.status(401).send({ message: "unauthorized" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if(err){
      return res.status(401).send({ message: "unauthorized"})
    }
    req.user = decoded
    next()
  })
}


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const foodCollection = client.db("foodDB").collection("food");
    const requestFoodCollection = client.db("foodDB").collection("requestFood");

    //auth related api
    app.post('/jwt', async (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h"
      })
      res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 60 * 60 * 1000
      }).send({success : true})
    })

    app.post('/logout', async (req, res) => {
      const user = req = req
      res.clearCookie("token", {maxAge: 0}).send({success : true})
    })

    //food related api
    app.get("/foods",   async (req, res) => {
      const search = req.query.search;
      const filter = { foodName: search };
      if (search) {
        const result = await foodCollection.find(filter).toArray();
        res.send(result);
      } else {
        const result = await foodCollection.find().toArray();
        res.send(result);
      }
    });
    app.get("/short-foods", async (req, res) => {
      const result = await foodCollection.find().sort({expiredDate: 1}).toArray()
      res.send(result);
    })
    app.get("/manage-foods", verifyToken, async (req, res) => {
      if(req?.query?.email !== req?.user?.email){
        return res.status(403).send({message : "forbidden"})
      }
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

    app.post("/foods", verifyToken, async (req, res) => {
      try {
        const food = req.body;
        const result = await foodCollection.insertOne(food);
        res.send(result);
      } catch (err) {
        console.log(err.massage);
      }
    });

    app.put("/foods/:id", verifyToken, async (req, res) => {
      const food = req.body;
      const id = req.params;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateFood = {
        $set: {
          foodName: food.foodName,
          foodImg: food.foodImg,
          quantity: food.quantity,
          pickupLocation: food.pickupLocation,
          expiredDate: food.expiredDate,
          additionalInformation: food.additionalInformation,
        },
      };
      const result = await foodCollection.updateOne(
        filter,
        updateFood,
        options
      );
      res.send(result);
    });

    app.delete("/foods/:id",verifyToken, async (req, res) => {
      const id = req.params;
      const cursor = { _id: new ObjectId(id) };
      const result = await foodCollection.deleteOne(cursor);
      res.send(result);
    });

    // request food related api
    app.get("/request-foods", verifyToken, async (req, res) => {
      if(req?.query?.email !== req?.user?.email){
        return res.status(403).send({message : "forbidden"})
      }
      const email = req.query.email;
      const cursor = { requesterEmail: email };
      const result = await requestFoodCollection.find(cursor).toArray();
      res.send(result);
    });
    app.get("/manage-single-foods-request/:id", verifyToken, async (req, res) => {
      const id = req?.params?.id;
      const cursor = { foodId: id };
      const result = await requestFoodCollection.find(cursor).toArray();
      res.send(result);
    });
    app.post("/request-foods", verifyToken, async (req, res) => {
      const food = req.body;
      const result = await requestFoodCollection.insertOne(food);
      res.send(result);
    });
    app.put("/request/:id", verifyToken, async (req, res) => {
      const food = req.body;
      const id = req.params;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          status: food.status,
        },
      };
      const result = await requestFoodCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });
    app.delete("/request/:id", verifyToken, async (req, res) => {
      const id = req.params;
      const cursor = { _id: new ObjectId(id) };
      const result = await requestFoodCollection.deleteOne(cursor);
      res.send(result);
    });

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
