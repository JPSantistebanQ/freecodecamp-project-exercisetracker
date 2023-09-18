const express = require('express')
const app = express()
const cors = require('cors')
let bodyParser = require('body-parser')
let mongoose = require('mongoose')

require('dotenv').config()

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

let Schema = mongoose.Schema;

const exerciseSchema = new Schema({
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    required: true
  }
});

let Exercise = mongoose.model('Exercise', exerciseSchema);

const userSchema = new Schema({
  username: {
    type: String,
    required: true
  },
  logs: [
      {type: Schema.Types.ObjectId, ref: 'Exercise'}
    ]
});

let User = mongoose.model('User', userSchema);

app.use(cors())
app.use(express.static('public'))

app.use(bodyParser.urlencoded({extended: false}))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', async (req, res) => {
  let username = req.body.username
  let user = new User({username, logs: []});
  await (user).save()

  //let exercises = await Exercise.find({})
  //console.log('Exercises: ', exercises)
  
  console.log('NEW user: ', user)
  res.json({
    username: user.username,
    _id: user._id
    })
})


app.post('/api/users/:_id/exercises', async (req, res) => {
  console.log(req.body)
  const {description, duration, date} = req.body
  let user = await User.findById(req.params._id)

  if(!user)
    res.send("User not found")
  
  let exercise = new Exercise({
    description,
    duration,
    date: date ? new Date(date) : new Date()
  })

  await exercise.save()

  console.log('BEFORE user: ', user)

  user = await User.findOneAndUpdate(
    { _id: user._id },
    { $push: { logs: exercise._id  } },
    { new: true, runValidators: true }
)

  console.log('UPDATED user: ', user)
  
  res.json({
    username: user.username,
    _id: user._id,
    description: exercise.description,
    duration: exercise.duration,
    date: exercise.date.toDateString()
    })
})

app.get('/api/users/:_id/logs', async (req, res) => {
  const {from, to, limit } = req.query;
  console.log('from :', from, ', to :', to, ' limit: ', limit)
  let filter = {
    _id: req.params._id
  }

  let user = await User.findOneAndUpdate(
    { _id: req.params._id },
    {  },
    { new: true, runValidators: true }
)
  .populate('logs')
  .exec()

  if(!user)
    res.send("User not found")
  
  console.log('USER: ', user)
  let exercises = user.logs
  
  console.log('exercises: ', exercises)
  let filteredExercises = exercises.filter(
    e => {
      if(from && e.date < new Date(from))
        return false;

      if(to && e.date > new Date(to))
        return false;

      return true;
    }
  )

  let limitedExercises = filteredExercises;
  if(limit)
    limitedExercises = filteredExercises.slice(0, limit);

  console.log('limited: ', limitedExercises)

  let count = limitedExercises.length

  let logsResponse = limitedExercises.map(ex => (
        {
          description: ex.description,
          duration: ex.duration,
          date: ex.date.toDateString(),
        })
     )
  
  res.json({
    username: user.username,
    count: count,
    _id: user._id,
    log: logsResponse
    })
})

app.get('/api/users', async (req, res) => {
  let users = await User.find({});
  res.json(
    users.map(user => (
      {
        username: user.username,
        _id: user._id
      }
    ))
  )
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
