const mongoose = require('mongoose');

const cycleConfigSchema = new mongoose.Schema({
  year: { type: Number, required: true, unique: true },
  goalSettingOpen: { type: Date, required: true },
  goalSettingClose: { type: Date, required: true },
  quarters: {
    q1: {
      label: { type: String, default: 'Q1 (Apr–Jun)' },
      windowOpen: Date,
      windowClose: Date
    },
    q2: {
      label: { type: String, default: 'Q2 (Jul–Sep)' },
      windowOpen: Date,
      windowClose: Date
    },
    q3: {
      label: { type: String, default: 'Q3 (Oct–Dec)' },
      windowOpen: Date,
      windowClose: Date
    },
    q4: {
      label: { type: String, default: 'Q4 (Jan–Mar)' },
      windowOpen: Date,
      windowClose: Date
    }
  },
  escalationRules: {
    goalSubmissionDays: { type: Number, default: 7 },
    goalApprovalDays: { type: Number, default: 5 },
    checkinDays: { type: Number, default: 7 }
  },
  thrustAreas: [{
    name: String,
    description: String
  }],
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('CycleConfig', cycleConfigSchema);