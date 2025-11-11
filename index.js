import express from "express";
import mongoose from "mongoose";
import Word from "./models/word.js";
import User from "./models/users.js";
import Score from "./models/score.js";
import { v4 as uuidv4 } from "uuid";
import cors from "cors";


const app = express();
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://esx-word-puzzle.vercel.app"
  ],
  methods: ["GET", "POST"],
  credentials: true,
}));
app.use(express.json());




// ✅ Connect to MongoDB
const MONGO_URI = "mongodb+srv://Eyob:%2314%40eyob@wordpuzzle.to1irl3.mongodb.net/?retryWrites=true&w=majority&appName=WordPuzzle";

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));



// ✅ New API endpoint: fetch a batch of words
app.get("/api/wordbatch", async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 300; // default 50 words per batch
    const words = await Word.aggregate([{ $sample: { size: limit } }]); // random sample from MongoDB
    // Map to only include what frontend needs
    const formattedWords = words.map(w => ({ word: w.word, hint: w.hint }));
    res.json(formattedWords);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch word batch" });
  }
});

// ✅ Optional: single random word endpoint for backward compatibility
app.get("/api/word", async (req, res) => {
  try {
    const count = await Word.countDocuments();
    const random = Math.floor(Math.random() * count);
    const word = await Word.findOne().skip(random);
    res.json(word);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch word" });
  }
});

// register or retrive user
app.post("/api/user", async (req, res) => {
  try{
    const { username } = req.body;
    if(!username) return res.status(400).json({error:"Username is required"});

    let user = await User.findOne({username});
    if (!user){
      user = await User.create({username, userId: uuidv4()});
    }
    res.json({userId: user.userId, username: user.username});
  } catch(err){
    console.error("User creation error:", err);
    res.status(500).json({error: "Server error"});
  }
}); 

app.post("/api/user/score", async (req, res) => {
  const { userId, score } = req.body;

  if (!userId || typeof score !== "number") {
    return res.status(400).json({ error: "userId and score are required" });
  }

  try {
    // Find existing score
    let userScore = await Score.findOne({ userId });

    if (!userScore) {
      // If no score exists, create a new one
      userScore = new Score({ userId, score });
      await userScore.save();
    } else if (score > userScore.score) {
      // Only update if new score is greater
      userScore.score = score;
      await userScore.save();
    }

    res.json({ message: "Score recorded", score: userScore.score });
  } catch (err) {
    console.error("Score recording error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// ✅ Start server
app.listen(3000, () => {
  console.log("Server running on port 3000");
});

