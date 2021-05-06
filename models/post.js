const mongoose = require('mongoose')
const { ObjectId } = mongoose.Schema.Types
const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
    },
    body: {
      type: String,
    },
    likes: [{ type: ObjectId, ref: 'User' }],
    comments: [
      {
        text: String,
        postedBy: { type: ObjectId, ref: 'User' },
      },
    ],
    photo: {
      type: String,
    },
    postedBy: {
      type: ObjectId,
      ref: 'User',
    },
    createdAt: {
      type: String,
    },
  },
  { timestamps: { createdAt: 'created_on' } }
)

mongoose.model('Post', postSchema)
