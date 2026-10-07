'use strict';

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    _id: { type: String }, // e.g. "ADMIN", "PM01", "DEV01"
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['ADMIN', 'MANAGER', 'AGENT'], required: true },
    specialization: { type: String, default: '' },
    skills: { type: [String], default: [] },
  },
  {
    _id: false, // We manage _id ourselves (string ids)
    versionKey: false,
  }
);

// toJSON transform: expose id, drop _id, __v, passwordHash
userSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
