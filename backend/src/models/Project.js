'use strict';

const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    clientName: { type: String, required: true },
    description: { type: String, default: '' },
    managerId: { type: String, ref: 'User', required: true, index: true },
    deadline: { type: String, required: true }, // YYYY-MM-DD
  },
  { versionKey: false }
);

projectSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Project', projectSchema);
