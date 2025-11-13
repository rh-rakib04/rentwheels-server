const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

console.log(
  "user",
  process.env.DB_USERNAME,
  "password",
  process.env.DB_PASSWORD
);

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.aczt7zj.mongodb.net/rent-wheel?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", (req, res) => {
  res.send("Welcome to RentWheels API ");
});

async function run() {
  try {
    await client.connect();
    const db = client.db("rent-wheel");
    const carsCollection = db.collection("cars");
    // ----------------> Cars Api
    app.get("/cars", async (req, res) => {
      const result = await carsCollection.find().toArray();
      res.send(result);
    });

    app.get("/cars-details/:id", async (req, res) => {
      const { id } = req.params;
      const objectId = new ObjectId(id);
      const result = await carsCollection.findOne({ _id: objectId });
      res.send({
        success: true,
        result,
      });
    });

    app.get("/featured-cars", async (req, res) => {
      const result = await carsCollection
        .find()
        .sort({ created_at: "desc" })
        .limit(6)
        .toArray();
      res.send(result);
    });

    app.post("/cars", async (req, res) => {
      const data = req.body;
      const result = await carsCollection.insertOne(data);
      res.send({
        success: true,
        result,
      });
    });

    app.put("/cars/:id", async (req, res) => {
      const { id } = req.params;
      const data = req.body;
      const objectId = new ObjectId(id);
      const filter = { _id: objectId };
      const update = {
        $set: data,
      };

      const result = await carsCollection.updateOne(filter, update);

      res.send({
        success: true,
        result,
      });
    });

    await db.command({ ping: 1 });
    console.log("✅ MongoDB connection successful!");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
  }
}

run().catch(console.dir);

app.listen(PORT, () => console.log(`🚗 Server running on port ${PORT}`));
