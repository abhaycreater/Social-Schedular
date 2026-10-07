import mongoose from "mongoose";

const connectDb = async ()=>{
    try{
        mongoose.connection.on("connected" , async()=>{
            console.log("MongoDB connected")
        });
        await mongoose.connect(process.env.MONGOdB_URI!)
    }catch(error : any){
        console.log(error);
        process.exit(1)
    }
}

export default connectDb;