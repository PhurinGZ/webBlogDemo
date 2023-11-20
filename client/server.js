const User = require("./model/userModel");
const Post = require("./model/postModel");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const path = require("path");

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:10000"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, // Allow credentials (cookies)
  })
);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static("Public"));
dotenv.config();
const PORT = process.env.PORT || 5000;

mongoose
  .connect("mongodb://localhost:27017/my-database", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true,
  })
  .then(() => console.log("Connected!!"))
  .catch((error) => console.error("MongoDB connection error:", error));

const verifyUser = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.json("The token was not available");
  } else {
    jwt.verify(token, "jwt-secret-key", (err, decoded) => {
      if (err) {
        return res.json("Token is wrong");
      } else {
        req.email = decoded.email;
        req.name = decoded.name;
      }
      next();
    });
  }
};

app.get("/", verifyUser, async (req, res) => {
  return res.json({ email: req.email, name: req.name });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email, password });
    if (user) {
      const token = jwt.sign({ email: user.email, name: user.name }, "jwt-secret-key", {
        expiresIn: "1d",
      });
      res.cookie("token", token);
      res.json({ success: true, user });
    } else {
      res.json({ success: false, message: "Invalid credentials" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/register", async (req, res) => {
  const formData = req.body;

  if (!formData.name || !formData.email || !formData.password) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const user = new User({
    name: formData.name,
    email: formData.email,
    password: formData.password,
  });

  try {
    await user.save();
    return res.status(201).json({ message: "Registration successful" });
  } catch (error) {
    return res.status(500).json({ message: "Registration failed" });
  }
});

const storages = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "Public/Images");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "_" + Date.now() + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storages,
});

app.post("/create", verifyUser, upload.single("file"), (req, res) => {
  Post.create({
    title: req.body.title,
    description: req.body.description,
    file: req.file.filename,
    email: req.body.email,
    name: req.body.name,
  })
    .then((result) => res.json(result))
    .catch((err) => res.json(err));
});

app.get("/getPosts", (req, res) => {
  Post.find()
    .then((posts) => res.json(posts))
    .catch((err) => res.json(err));
});

app.get("/getPostByid/:id", (req, res) => {
  const id = req.params.id;
  Post.findById({ _id: id })
    .then((post) => res.json(post))
    .catch((err) => console.log(err));
});

app.put("/editpost/:id", (req, res) => {
  const id = req.params.id;
  Post.findByIdAndUpdate(
    { _id: id },
    {
      title: req.body.title,
      description: req.body.description,
    }
  )
    .then((result) => res.json(result))
    .catch((err) => res.json(err));
});

app.delete("/deletepost/:id", (req, res) => {
  Post.findByIdAndDelete({ _id: req.params.id })
    .then((result) => res.json("Success"))
    .catch((err) => res.json(err));
});

app.get("/logout", (req, res) => {
  res.clearCookie("token");
  return res.json("Success");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
