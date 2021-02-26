import express from 'express';
import mongoose from 'mongoose';
import Cors from "cors";
import Pusher from "pusher";
import dotenv from "dotenv";
dotenv.config();
import mongoData from "./dbModel.js"

//app config
const app = express();
const port =process.env.PORT || 9000;
const secret = process.env.SECRET_KEY;
const pusher = new Pusher({
    appId: "1162401",
    key: "d267707ca5f5b5553d08",
    secret: secret,
    cluster: "ap2",
    useTLS: true
  });
//middleware
app.use(express.json());
app.use(Cors())
//db config
const password = process.env.PASSWORD;
const connection_url=`mongodb+srv://admin:${password}@cluster0.tdayz.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
mongoose.connect(connection_url,{
    useCreateIndex:true,
    useNewUrlParser:true,
    useUnifiedTopology:true,
});
mongoose.connection.once("open",()=>{
    console.log("DB Connected");
    const changeStream =mongoose.connection.collection("conversations").watch();

    changeStream.on("change",(change)=>{
        if(change.operationType==="insert"){
            pusher.trigger("chats","newChat",{
                change:change
            })
            }else if(change.operationType==="update"){
                pusher.trigger("messages","newMessage",{
                    change:change
                })
        }else{
            console.log(Error);
        }
    })

});
//api routes
app.get('/',(req, res) => {
    res.status(200).send("hello");
})

app.post("/new/conversation",(req, res) => {
    const dbData=req.body;
    mongoData.create(dbData,(err, data) => {
        if (err){
            res.status(500).send(err);
        }else{
            res.status(201).send(data)
        }
    })
})

app.post("/new/message",(req, res)=>{
    mongoData.update(
        {_id:req.query.id},
        {$push:{conversation:req.body}},
        (err, data)=>{
            if(err){
                res.status(500).send(err)
            }else{
                res.status(201).send(data)
            }
        }
    )
})

app.get('/get/conversationList',(req, res)=>{
    mongoData.find((err, data)=>{
        if(err){
            res.status(500).send(err)
        }else{
            data.sort((b,a)=>{
                return a.timestamp-b.timestamp
            });
            let conversations=[];

            data.map((conversationData)=>{
                const conversationInfo ={
                    id: conversationData._id,
                    name: conversationData.chatName,
                    timestamp:conversationData.conversation[0].timestamp,
                }

                conversations.push(conversationInfo);
            })
            res.status(200).send(conversations);
            
        }
    })
})

app.get("/get/conversation",(req, res)=>{
    const id = req.query.id;

    mongoData.find({_id:id}, (err, data)=>{
        if(err){
            res.status(500).send(err)
        }else{
            res.status(200).send(data)
        }
    })
})

app.get("/get/lastMessage",(req, res)=>{
    const id=req.query.id;
    mongoData.find({_id:id}, (err, data)=>{
        if(err){
            res.status(500).send(err);
        }else{
            let convData=data[0].conversation;

            convData.sort((b,a)=>{
                return a.timestamp-b.timestamp
            })

            res.status(200).send(convData[0])
        }
    })
})
//listener
app.listen(port,()=>console.log(`listening to port ${port}`));