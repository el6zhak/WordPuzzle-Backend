import express from "express";
import mongoose from "mongoose";
import Word from "./models/word.js";
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

// ✅ Start server
app.listen(3000, () => {
  console.log("Server running on port 3000");
});

