const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const User = mongoose.model('User')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const requireLogin = require('../middleware/requireLogin')
const nodemailer = require('nodemailer')
const sendgridTransport = require('nodemailer-sendgrid-transport')

const transporter = nodemailer.createTransport(
  sendgridTransport({
    auth: {
      api_key: process.env.SEND_GRID_KEY,
    },
  })
)

router.get('/protected', requireLogin, (req, res) => {
  res.send('hello User')
})

router.post('/unverified-users', (req, res) => {
  console.log('unverified users')
  const { datenow } = req.body
  console.log(datenow)
  User.deleteMany({
    $and: [
      { expireEmailToken: { $lte: datenow } },
      { expireEmailToken: { $ne: null } },
      { isVerified: false },
    ],
  })
    .then((data) => {
      if (data) {
        return res.status(200).json({ message: 'unverified users removed' })
      }
    })
    .catch((err) => console.log(err))
})

router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body
  if (!email || !password || !name) {
    return res.status(422).json({
      error: 'please fill all requires fields',
    })
  }
  User.findOne({ email: email })
    .then((savedUser) => {
      if (savedUser) {
        return res.status(422).json({
          error: 'User Already Exists with this email',
        })
      }
      User.findOne({ name: name })
        .then((savedname) => {
          if (savedname) {
            return res.status(422).json({
              error: 'User Already Exists with this Username',
            })
          }
          crypto.randomBytes(32, (err, buffer) => {
            if (err) {
              console.log(err)
            }
            const token = buffer.toString('hex')
            bcrypt.hash(password, 12).then((hashedPassword) => {
              const user = new User({
                email,
                name,
                password: hashedPassword,
                emailToken: token,
                expireEmailToken: Date.now() + 1800000,
              })

              user
                .save()
                .then((user) => {
                  transporter.sendMail({
                    to: user.email,
                    from: 'appblogcode@gmail.com',
                    subject: 'Verify account',
                    html: `
                                <h1>verify your user account</h1>
                                <h3><a href='https://blogcode.netlify.app/verify/${token}/${user._id}'>click on this  link to verify your user account</a></h3>
                                `,
                  })
                  res.json({
                    message: 'check your email and verify your account',
                  })
                })
                .catch((err) => {
                  console.log(err + 'mail error found')
                })
            })
          })
        })
        .catch((err) => {
          console.log(err)
        })
    })
    .catch((err) => {
      console.log(err)
    })
})

router.post('/signin', (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(422).json({ error: 'please add email or password' })
  }

  User.findOne({ email: email }).then((savedUser) => {
    if (!savedUser) {
      return res.status(422).json({ error: 'Invalid Email or Password' })
    }

    bcrypt
      .compare(password, savedUser.password)
      .then((doMatch) => {
        if (doMatch) {
          if (!savedUser.isVerified) {
            return res
              .status(422)
              .json({ error: 'your account is not verified' })
          }
          const token = jwt.sign({ _id: savedUser._id }, process.env.JWT_SECRET)
          const { _id, name, email } = savedUser
          res.json({ token, user: { _id, name, email } })
        } else {
          return res.status(422).json({ error: 'Invalid Email or Password' })
        }
      })
      .catch((err) => {
        console.log(err)
      })
  })
})

router.post('/reset-password', (req, res) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err)
    }
    const token = buffer.toString('hex')
    User.findOne({ email: req.body.email }).then((user) => {
      if (!user) {
        return res.status(422).json({ error: "user doesn't exist" })
      }
      user.resetToken = token
      user.expireToken = Date.now() + 3600000
      user.save().then((result) => {
        transporter.sendMail({
          to: user.email,
          from: 'appblogcode@gmail.com',
          subject: 'reset password',
          html: `
                        <h1>you requested for password reset.</h1>
                        <h3><a href='https://blogcode.netlify.app/reset/${token}'>click on this link to reset password</a></h3>
                        `,
        })
        res.json({ message: 'check your email' })
      })
    })
  })
})

router.post('/new-password', (req, res) => {
  const newPassword = req.body.password
  const sentToken = req.body.token
  const currentTime = req.body.currentTime
  User.findOne({ resetToken: sentToken, expireToken: { $gt: currentTime } })
    .then((user) => {
      if (!user) {
        return res.status(422).json({ error: ' Session Expired' })
      }
      bcrypt.hash(newPassword, 12).then((hashedpassword) => {
        user.password = hashedpassword
        user.resetToken = undefined
        user.expireToken = undefined
        user.save().then((savedUser) => {
          res.json({ message: 'password updated successfully' })
        })
      })
    })
    .catch((err) => console.log(err))
})

router.post('/verify', (req, res) => {
  const { userId, currentTime, token } = req.body
  User.findOne({
    _id: userId,
    emailToken: token,
    expireEmailToken: { $gt: currentTime },
    isVerified: false,
  })
    .then((user) => {
      if (!user) {
        return User.findOne({ _id: userId, isVerified: true }).then((user) => {
          res.json({ error: 'you already a verified user ' })
        })
      }
      user.isVerified = true
      user.emailToken = undefined
      user.expireEmailToken = undefined
      user
        .save()
        .then((savedUser) => {
          res.json({ message: 'account verified' })
        })
        .catch((err) => {
          console.log(err)
        })
    })
    .catch((err) => {
      console.log(err)
    })
})
module.exports = router
