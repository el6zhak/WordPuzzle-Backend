import mongoose from "mongoose";

const ScoreSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  score: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Score || mongoose.model("Score", ScoreSchema);

