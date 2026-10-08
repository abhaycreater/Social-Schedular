import "dotenv/config";
import express, { NextFunction, Request, Response } from 'express';
import cors from "cors";
import connectDb from "./config/db.js";
import authRoute from './routes/auth.routes.js'
import socialMediaRoute from "./routes/socialAuth.routes.js";
import accountsRoute from "./routes/account.routes.js";
import postRouter from "./routes/post.routes.js";

const app = express();

//Database Connection 
await connectDb();

// Middleware
app.use(cors())
app.use(express.json());

const port = process.env.PORT || 3000;

app.get('/', (req: Request, res: Response) => {
    res.send('Server is Live!');
});

app.use('/api/auth', authRoute )
app.use('/api/oauth' , socialMediaRoute)
app.use('/api/account' , accountsRoute)
app.use('/api/post' , postRouter)

//Global error  handler
app.use((err: any, _req: Request , res:Response , _next:NextFunction)=>{
    console.log(err);
    res.status(500).send(err?.response?.data?.message || err?.message)
})

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});