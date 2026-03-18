const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Use this specific syntax for every function
const register = async (req , res)=>{
    try {
        const {name, email, password} = req.body;
        const existingUser = await User.findOne({email});

        if(existingUser){
            return res.status(400).json({ error: "User already exists" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const user = await User.create({
            name, 
            email, 
            password: hashedPassword
        });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({
            token, 
            user: { id: user._id, name: user.name, email: user.email }
        });
    } catch(error) {
        res.status(500).json({ error: "Registration Failed" });
    }
};

const login = async (req, res)=>{
    try {
        const {email, password} = req.body;
        const user = await User.findOne({email});

        if(!user) return res.status(400).json({ error: "User Not Found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch) return res.status(400).json({ error: "Invalid Credentials" });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(200).json({
            token,
            user: { id: user._id, name: user.name, email: user.email }
        });
    } catch(error) {
        res.status(500).json({ error: "Login Failed" });
    }
};

// EXPORT THEM AT THE VERY END IN ONE OBJECT
module.exports = { register, login };