const mongoose = require('mongoose');
const uri = "mongodb+srv://contactmdb:4VNC0SSbLclk9m27@cluster0.aiqgimm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0/contact_manager"
const connectDB = async () => {
    return mongoose.connect(uri)
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch((error) => {
        console.log(error)
    });
};

module.exports = connectDB;


