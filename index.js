const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');
const { Schema } = mongoose;

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB', err);
  });

// Define User schema and model
const UserSchema = new Schema({
  username: { type: String, required: true },
});
const User = mongoose.model("User", UserSchema);

// Define Exercise schema and model
const ExerciseSchema = new Schema({
  user_id: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});
const Exercise = mongoose.model("Exercise", ExerciseSchema);

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Route to get all users
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}).select("_id username");
    if (!users.length) {
      res.send("No users");
    } else {
      res.json(users);
    }
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.post("/api/users", async (req, res) => {
  console.log(req.body);
  const userObj = new User({
    username: req.body.username
  });

  try {
    const user = await userObj.save();
    console.log(user);
    res.json(user);
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const id = req.params._id;
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) {
      res.send("Could not find user");
    } else {
      const exerciseObj = new Exercise({
        user_id: user._id,
        description,
        duration,
        date: date ? new Date(date) : new Date()
      });
      const exercise = await exerciseObj.save();
      res.json({
        _id: user._id,
        username: user.username,
        description: exercise.description,
        duration: exercise.duration,
        date: new Date(exercise.date).toDateString()
      });
    }
  } catch (err) {
    console.error('Error saving exercise:', err);
    res.status(500).json({ error: "Failed to save exercise" });
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const { from, to, limit } = req.query;
  const id = req.params._id;

  try {
    const user = await User.findById(id);
    if (!user) {
      res.send("Could not find user");
      return;
    }

    let dateObj = {};
    if (from) dateObj["$gte"] = new Date(from);
    if (to) dateObj["$lte"] = new Date(to);

    let filter = {
      user_id: id,
    };

    if (from || to) filter.date = dateObj;

    const exercises = await Exercise.find(filter).limit(+limit || 500);
    const log = exercises.map((e) => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString(),
    }));

    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log,
    });
  } catch (err) {
    console.error('Error fetching logs:', err);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

// Start the server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});