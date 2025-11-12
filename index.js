const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const uri = "mongodb+srv://BillManagement:9N8hPBS8IqBIoyd7@wasin3.w2xfr9.mongodb.net/?appName=Wasin3";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  tls: true,
  tlsAllowInvalidCertificates: true,
});

// Default route
app.get("/", (req, res) => {
  res.send("Smart Bill Management server is running");
});

async function run() {
  try {
    await client.connect();
    const db = client.db("utility_db");

    const billsCollection = db.collection("bills");
    const recentBillsCollection = db.collection("recentBills");
    const usersCollection = db.collection("users");
    const payBillCollection = db.collection("payBill");

    /** USERS API **/
    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const email = newUser.email;

      const existingUser = await usersCollection.findOne({ email });
      if (existingUser) {
        return res.send({ message: "User already exists" });
      }

      const result = await usersCollection.insertOne(newUser);
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      const users = await usersCollection.find().toArray();
      res.send(users);
    });

    /** BILLS API **/
    app.get("/bills", async (req, res) => {
      const { category, limit } = req.query;
      const query = {};
      if (category) query.category = category;

      let cursor = billsCollection.find(query).sort({ date: -1 });
      if (limit) cursor = cursor.limit(parseInt(limit));

      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/bills/:id", async (req, res) => {
      const id = req.params.id;
      const bill = await billsCollection.findOne({ _id: new ObjectId(id) });
      res.send(bill);
    });

    app.post("/bills", async (req, res) => {
      const newBill = req.body;
      const result = await billsCollection.insertOne(newBill);
      res.send(result);
    });

    app.patch("/bills/:id", async (req, res) => {
      const id = req.params.id;
      const updatedBill = req.body;

      const result = await billsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedBill }
      );
      res.send(result);
    });

    app.delete("/bills/:id", async (req, res) => {
      const id = req.params.id;
      const result = await billsCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    /** RECENT BILLS API **/
    app.get("/recentBills", async (req, res) => {
      const { limit } = req.query;
      let cursor = recentBillsCollection.find().sort({ date: -1 });
      if (limit) cursor = cursor.limit(parseInt(limit));
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/recentBills", async (req, res) => {
      try {
        const recentBill = req.body;
        if (
          !recentBill.title ||
          !recentBill.category ||
          !recentBill.email ||
          !recentBill.location ||
          !recentBill.amount
        ) {
          return res.status(400).send({ message: "Missing required fields" });
        }

        if (!recentBill.date) {
          recentBill.date = new Date().toISOString().split("T")[0];
        }

        const result = await recentBillsCollection.insertOne(recentBill);
        res.status(201).send({ message: "Recent bill added successfully", result });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to add recent bill", error });
      }
    });

    /** PAY BILL API **/
    app.get("/payBill", async (req, res) => {
      const result = await payBillCollection.find().toArray();
      res.send(result);
    });

    app.post("/payBill", async (req, res) => {
      const newBill = req.body;
      const result = await payBillCollection.insertOne(newBill);
      res.send(result);
    });

    // DELETE Pay Bill
    
    app.delete("/payBill/:id", async (req, res) => {
      const id = req.params.id;
      const result = await payBillCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log("✅ Successfully connected to MongoDB!");
  } finally {
    // Optional: client.close();
  }
}

run().catch(console.dir);

// Server listen
app.listen(port, () => {
  console.log(`✅ Utility Bill Management server running on port ${port}`);
});
