const express = require('express');
const morgan = require('morgan');
const connectDB = require('./config/db');
const auth = require('./middlewares/auth');
const contactRoutes = require('./routes/contactRoutes');
require("dotenv").config({path:"./config/config.env"});
const cors = require('cors');

const app = express();

app.use(cors('*'));
// middelewares
app.use(express.json());
app.use(morgan('tiny'));

// routes
app.get('/protected',auth,(req,res) => {
    res.status(200).json({user:req.user});
});
app.use('/', require('./routes/auth'));

// Routes
app.use('/contacts', contactRoutes);


const PORT = process.env.PORT || 8080;
app.listen(PORT, async () => {
    try {
        await connectDB();
        console.log(`Server is running at ${PORT}`);
    } catch (error) {
        console.log(error);
    }
});

