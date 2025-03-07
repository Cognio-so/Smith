const User = require("../model/userModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const passport = require('../lib/passport');

const Signup = async (req, res) => {

    const {name, email, password} = req.body;

    try {

        if(!name || !email || !password){
            return res.status(400).json({message: "All feilds are required"});
        }

        if(password.length < 6){
            return res.status(400).json({message: "Password must be at least 6 char long "});
        }

        const user = await User.findOne({email});

        if(user) return res.status(400).json({message: "Email already exists"});

        //hashing password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password,salt);


        const newUser = new User({name , email , password: hashedPassword});

       if(newUser){
        //generate jwt token
        generateToken(newUser._id, res);
        await newUser.save();

        res.status(201).json({
            _id: newUser._id,
            name: newUser.name,
            email: newUser.email,
        });

       }else{
        res.status(400).json({message: "Invalid user data"});
       }
    } catch (error) {
        console.log("Error in signup controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const Login = async(req,res)=>{

    const {email , password} = req.body;

    try {
       
        const user = await User.findOne({email});

        if(!user) return res.status(400).json({message: "User not found"});
        
        const isPasswordCorrect = await bcrypt.compare(password,user.password);

        if(!isPasswordCorrect) return res.status(400).json({message: "Invalid password"});


        generateToken(user._id, res);

        res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
        });


    } catch (error) {
        console.log("Error in login controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const Logout = async(req,res)=>{
    try {
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            path: '/',
            maxAge: 0
        };
        
        res.cookie('jwt', '', cookieOptions);
        res.status(200).json({message: "Logged out successfully"});
    } catch (error) {
        console.error("Error in logout controller:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const checkAuth = async(req,res)=>{
    try {
        res.status(200).json(req.user);
    } catch (error) {
        console.log("Error in check auth controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const getProfile = async (req,res)=>{
    try {
        res.json(req.user);
    } catch (error) {
        console.log("Error in get profile controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

const generateToken = (userId, res) => {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });

    // Consistent cookie settings across all auth operations
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // true in production only
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60 * 1000
    };

    res.cookie('jwt', token, cookieOptions);
};

// Google auth callback handler
const googleCallback = (req, res) => {
  try {
    if (!req.user) {
      console.error('Google callback: No user data received');
      throw new Error('Authentication failed - No user data');
    }

    // Generate token for the authenticated user
    generateToken(req.user._id, res);
    
    // Log successful authentication
    console.log(`Successful Google authentication for user: ${req.user.email}`);
    
    // Redirect with proper URL construction
    const dashboardUrl = new URL('/dashboard', process.env.FRONTEND_URL).toString();
    res.redirect(dashboardUrl);
  } catch (error) {
    console.error('Google auth callback error:', error);
    const loginUrl = new URL('/login', process.env.FRONTEND_URL).toString();
    res.redirect(`${loginUrl}?error=auth_failed&message=${encodeURIComponent(error.message)}`);
  }
};

module.exports = {Signup, Login, Logout, checkAuth, getProfile, googleCallback};