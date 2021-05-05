const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const Post = mongoose.model("Post")
const requireLogin = require('../middleware/requireLogin')

router.get('/allpost', (req, res) => {
    Post.find().populate("postedBy", "_id name").sort("-createdAt").then(posts => {
        res.json({ posts })
    }).catch(err => console.log(err))
})

router.get('/likedpost', requireLogin, (req, res) => {
    Post.find({ likes: req.user._id }).populate("postedBy", "_id name").sort("-createdAt").then(posts => {
        res.json({ posts })
    }).catch(err => console.log(err))
})

router.get('/posts/:id', (req, res) => {
    Post.findById(req.params.id).populate("postedBy", "_id name")
        .populate("comments.postedBy", "_id name").then(posts => {
            res.json({ posts })
        }).catch(err => console.log(err))
})

router.post('/createpost', requireLogin, (req, res) => {
    const { title, body, pic, createdAt } = req.body

    if (!title || !body) {
        return res.status(422).json({ error: "Please fill all required fields " })
    }

    const post = new Post({
        title,
        body,
        photo: pic,
        postedBy: req.user,
        createdAt
    })
    post.save().then(result => {
        res.json({ post: result })
    }).catch(err => console.log(err))
})

router.put('/like', requireLogin, (req, res) => {
    Post.findByIdAndUpdate(req.body.postId, {
        $addToSet: { likes: req.user._id }
    }, {
        new: true
    }).populate("postedBy", "_id name").populate("comments.postedBy", "_id name").sort("-createdAt").exec((err, result) => {
        if (err) {
            return res.status(422).json({ error: err })
        } else {
            res.json(result)
        }
    })
})

router.put('/unlike', requireLogin, (req, res) => {
    Post.findByIdAndUpdate(req.body.postId, {
        $pull: { likes: req.user._id }
    }, {
        new: true
    }).populate("postedBy", "_id name").populate("comments.postedBy", "_id name").sort("-createdAt").exec((err, result) => {
        if (err) {
            return res.status(422).json({ error: err })
        }
        else {
            res.json(result)
        }
    })
})

router.put('/comment', requireLogin, (req, res) => {
    const comment = {
        text: req.body.text,
        postedBy: req.user._id
    }
    Post.findByIdAndUpdate(req.body.postId, {
        $push: { comments: comment }
    }, {
        new: true
    }).populate("postedBy", "_id name").populate("comments.postedBy", "_id name").sort("-createdAt").exec((err, result) => {
        if (err) {
            return res.status(422).json({ error: err })
        } else {
            res.json(result)
        }
    })
})

router.put('/delete-comment', requireLogin, (req, res) => {
    const { postId, commentId } = req.body
    Post.findByIdAndUpdate(postId, {
        $pull: { comments: { _id: commentId } }
    }, {
        new: true
    }).populate("postedBy", "_id name").populate("comments.postedBy", "_id name").sort("-createdAt").exec((err, result) => {
        if (err) {
            return res.status(422).json({ error: err })
        } else {
            res.json(result)
        }
    })
})

router.delete('/deletepost/:id', requireLogin, (req, res) => {
    Post.findById(req.params.id).populate("postedBy", "_id")
        .exec((err, post) => {
            if (err || !post) {
                return res.status(422).json({ error: err })
            }
            if (post.postedBy._id.toString() === req.user._id.toString()) {
                post.remove()
                    .then(result => {
                        res.json(result)
                    }).catch(err => { console.log(err) })
            }
        })
})

router.get('/mypost', requireLogin, (req, res) => {
    Post.find({ postedBy: req.user._id }).populate("postedBy", "_id name").sort("-createdAt")
        .then(mypost => {
            res.json({ mypost })
        }).catch(err => console.log(err))
})

module.exports = router
