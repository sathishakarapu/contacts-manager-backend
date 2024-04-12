const router = require('express').Router();
const User = require("../models/User");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const multer = require('multer');
const csv = require('csv-parser');
const ContactsModel = require("../models/Contact");
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

// signup page
router.post("/signup", async (req, res) => {
    const { email, password, confirmPassword } = req.body;

    // checks all the missing fields
    if (!email || !password || !confirmPassword) {
        return res.status(400).json({ error: "Please enter all the required fields" });
    }

    const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // email validation
    if (!emailReg.test(email)) {
        return res.status(400).json({ error: "Please enter a valid email address" });
    }

    // validation of password
    if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters long" });
    }

    // validate confirm password
    if (password !== confirmPassword) {
        return res.status(400).json({ error: "Please enter the password correctly" });
    }

    try {
        // Check if user already exists
        const userAlreadyExist = await User.findOne({ email });
        if (userAlreadyExist) {
            return res.status(400).json({ error: `User with email ${email} already exists, please try another one` });
        }

        // Hash the password
        const hashPassword = await bcrypt.hash(password, 12);
        
        // Create a new user
        const newUser = new User({ email, password: hashPassword });

        // Save the user into the database
        const savedUser = await newUser.save();

        res.status(201).json({ message: "User registered successfully", user: savedUser });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// login page
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "please enter all the required fields" });
    }

    const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // email validation
    if (!emailReg.test(email)) {
        return res.status(400).json({ error: "please enter a valid email address" });
    }

    try {
        // Find user by email
        const userAlreadyExist = await User.findOne({ email });

        // If user doesn't exist
        if (!userAlreadyExist) {
            return res.status(404).json({ error: "User not found" });
        }

        // Check if passwords match
        const doesPasswordMatch = await bcrypt.compare(password, userAlreadyExist.password);
        if (!doesPasswordMatch) {
            return res.status(400).json({ error: "Invalid email or password!" });
        }

        // Generate JWT token
        const payload = { _id: userAlreadyExist._id };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
        return res.status(200).json({ token });
        
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
});

// verify user in the home page
router.get('/verifyUser', async (req, res) => {
    try {
        // Extract the token from the Authorization header
        const token = req.headers.authorization.split(" ")[1];

        // Verify the token
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch user details using the decoded token
        const user = await User.findById(decodedToken._id);

        // If user not found
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Send the user details as a response
        res.status(200).json({ user });
    } catch (error) {
        console.error(error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: "Invalid token" });
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: "Token expired" });
        } else {
            return res.status(500).json({ error: "Internal server error" });
        }
    }
});


// import contacts...every user have their own account !
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Destination folder for storing uploaded files
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname); // Use original filename
    }
});


const upload = multer({ storage: storage });
router.post('/importContacts', upload.single('csvFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const decodedToken = jwt.verify(req.body.token, process.env.JWT_SECRET);
        const contacts = [];

        // Parse the CSV file
        await new Promise((resolve, reject) => {
            fs.createReadStream(req.file.path)
                .pipe(csv())
                .on('data', (data) => {
                    contacts.push({
                        name: data.Name,
                        designation: data.Designation,
                        company: data.Company,
                        industry: data.Industry,
                        email: data.Email,
                        phone: data.PhoneNumber,
                        country: data.Country,
                        userId : decodedToken._id
                    });
                })
                .on('error', (error) => {
                    console.error('Error parsing CSV:', error);
                    reject(error);
                })
                .on('end', () => {
                    resolve();
                });
        });

        // Update or insert contacts into the database
        const bulkOps = contacts.map(contact => ({
            updateOne: {
                filter: { email: contact.email },
                update: { $set: contact },
                upsert: true // Insert new documents if email not found
            }
        }));

        const result = await ContactsModel.bulkWrite(bulkOps);

        res.status(200).json({ message: 'Contacts imported successfully', result });
    } catch (error) {
        console.error('Error importing contacts:', error);
        res.status(500).json({ error: 'Error importing contacts' });
    }
});

// get all the contats list
router.get('/contacts', async (req, res) => {
    try {
        const token = req.headers.authorization.split(" ")[1];
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        // Fetch contacts associated from the database
        const contacts = await ContactsModel.find({userId : decodedToken._id});

        // Send the contacts data as a response
        res.status(200).json(contacts);
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({ error: 'Error fetching contacts' });
    }
});

// get the contcats By Id
router.get('/contactById/:contactId', async (req, res) => {
    try {
        const contacts = await ContactsModel.findOne({_id : new ObjectId(req.params.contactId)});
        // Send the contacts data as a response
        res.status(200).json(contacts);
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({ error: 'Error fetching contacts' });
    }
});

// export the contacts
router.get('/exportContacts', async (req, res) => {
    try {
        // Retrieve contacts data from the database
        const contacts = await ContactsModel.find();

        // Convert contacts data to CSV format (customize as per your data structure)
        const csvData = contacts.map(contact => `${contact.name},${contact.email},${contact.phone},${contact.designation},${contact.company},${contact.industry},${contact.country}`).join('\n');

        // Set response headers for file download
        res.setHeader('Content-disposition', 'attachment; filename=contacts.csv');
        res.set('Content-Type', 'text/csv');

        // Send the CSV data as response
        res.send(csvData);
    } catch (error) {
        console.error('Error exporting contacts:', error);
        res.status(500).json({ error: 'Error exporting contacts' });
    }
});

// delete the contacts by Id
router.delete('/deleteContacts/:id', async (req, res) => {
    try {
        const deletedContact = await ContactsModel.findByIdAndDelete(req.params.id);
        if (!deletedContact) {
            return res.status(404).json({ message: 'Contact not found' });
        }
        res.status(200).json({ message: 'Contact deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


module.exports = router;