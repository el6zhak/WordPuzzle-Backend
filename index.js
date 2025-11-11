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
const MONGO_URI = "mongodb+srv://Eyob:%2314%40eyob@wordpuzzle.to1irl3.mongodb.net/test?retryWrites=true&w=majority&appName=WordPuzzle";

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    console.log(`🌐 Connected to database: ${mongoose.connection.db.databaseName}`);
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err));


app.get("/api/wordbatch", async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 300;
    const { difficulty } = req.query;
    
    console.log(`\n🔍 New request - Difficulty: ${difficulty || 'not specified'}, Limit: ${limit}`);

    // Build the match stage
    let matchStage = { difficulty: { $exists: true } };
    
    if (difficulty && ['beginner', 'intermediate', 'advanced'].includes(difficulty)) {
      matchStage = { difficulty: difficulty };
      console.log(`🔎 Filtering for difficulty: ${difficulty}`);
    }

    const pipeline = [
      { $match: matchStage },
      { $sample: { size: limit } }
    ];

    console.log('🔧 Aggregation pipeline:', JSON.stringify(pipeline, null, 2));

    const words = await Word.aggregate(pipeline);
    console.log(`✅ Found ${words.length} words`);
    
    // Log a few sample words and their difficulties
    if (words.length > 0) {
      console.log('📝 Sample words:');
      words.slice(0, 3).forEach((word, i) => {
        console.log(`   ${i+1}. ${word.word} (${word.difficulty})`);
      });
    }

    res.json(words.map(w => ({ 
      word: w.word, 
      hint: w.hint,
      difficulty: w.difficulty
    })));

  } catch (err) {
    console.error('❌ Error in /api/wordbatch:', err);
    res.status(500).json({ 
      error: "Failed to fetch word batch",
      details: err.message 
    });
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
    let uscore = await Score.findOne({userId: user.userId});
    if (!uscore){
      await Score.create({userId: user.userId, score: 0});
    }
    console.log(`User logged in: ${username} (ID: ${user.userId}) (Score initialized: ${uscore ? uscore.score : 0})`);
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

app.get("/api/user/:userId/score", async (req, res) => {
  try {
    const { userId } = req.params;
    console.log("Fetching score for user:", userId);

    const userScore = await Score.findOne({ userId }).sort({ createdAt: -1 }); // latest score

    if (!userScore) {
      return res.json({ score: 0 });
    }

    res.json({ score: userScore.score });
  } catch (error) {
    console.error("Error fetching score:", error);
    res.status(500).json({ message: "Server error" });
  }
});


// ✅ Start server
app.listen(3000, () => {
  console.log("Server running on port 3000");
});

