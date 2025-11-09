const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();  
const port = process.env.PORT || 3000;  

// Middleware......
app.use(cors());
app.use(express.json());

//71wPtHh9hTtiI2no
//SmartDB

const uri = "mongodb+srv://SmartDbUser:f2BWvckRLTDP4Jec@wasin3.w2xfr9.mongodb.net/?appName=Wasin3";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  tls: true,
  tlsAllowInvalidCertificates: true,  // ✅ Add this line
});

// Default route
app.get("/", (req, res) => {
  res.send("Smart server is running");
});

async function run(){
     try{
        await client.connect();

        const db = client.db('smart_db');
        const productsCollection = db.collection('products');

        app.get('/products', async(req, res) =>{
            const cursor = productsCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })

         app.get('/products/:id', async(req, res) =>{
            const id = req.params.id;
            const query = { _id: new ObjectId(id)}
            const result = await productsCollection.findOne(query);
            res.send(result);
        })

        app.post('/products', async(req, res) =>{
            const newProduct = req.body;
            const result = await productsCollection.insertOne(newProduct);
            res.send(result);
        })


         app.patch('/products/:id', async(req, res) =>{
            const id = req.params.id;
            const updatedProduct = req.body;
            const query = { _id: new ObjectId(id)}
            const update = {
                $set: {
                    name: updatedProduct.name,
                    price: updatedProduct.price
                }
            }
            const result = await productsCollection.updateOne(query,update);
            res.send(result);
        })
        
         app.delete('/products/:id', async(req, res) =>{
            const id = req.params.id;
            const query = { _id: new ObjectId(id)}
            const result = await productsCollection.deleteOne(query);
            res.send(result);
        })

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
     }
     finally{

     }
}

run().catch(console.dir)

// Server listen
app.listen(port, () => {
  console.log(`✅ Smart server is running on port ${port}`);
});
