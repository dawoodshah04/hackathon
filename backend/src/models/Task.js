'use strict';

const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    assigneeId: { type: String, ref: 'User', required: true, index: true },
    deadline: { type: String, required: true }, // YYYY-MM-DD
    estimatedHours: { type: Number, required: true, min: 0.001 },
  },
  { versionKey: false }
);

taskSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id.toString();
    ret.projectId = ret.projectId ? ret.projectId.toString() : ret.projectId;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Task', taskSchema);
