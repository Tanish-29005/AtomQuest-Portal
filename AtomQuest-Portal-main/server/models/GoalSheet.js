const mongoose = require('mongoose');

const goalItemSchema = new mongoose.Schema({
  thrustArea: { type: String, required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  uomType: {
    type: String,
    enum: ['min', 'max', 'timeline', 'zero'],
    required: true
  },
  target: { type: mongoose.Schema.Types.Mixed, required: true }, // number or date string
  weightage: { type: Number, required: true, min: 10, max: 100 },
  isShared: { type: Boolean, default: false },
  sharedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  primaryOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isReadOnly: { type: Boolean, default: false }, // title/target locked for shared goals

  // Quarterly achievements
  achievements: {
    q1: {
      actual: mongoose.Schema.Types.Mixed,
      status: { type: String, enum: ['not_started', 'on_track', 'completed', 'at_risk'], default: 'not_started' },
      score: { type: Number, default: 0 },
      updatedAt: Date
    },
    q2: {
      actual: mongoose.Schema.Types.Mixed,
      status: { type: String, enum: ['not_started', 'on_track', 'completed', 'at_risk'], default: 'not_started' },
      score: { type: Number, default: 0 },
      updatedAt: Date
    },
    q3: {
      actual: mongoose.Schema.Types.Mixed,
      status: { type: String, enum: ['not_started', 'on_track', 'completed', 'at_risk'], default: 'not_started' },
      score: { type: Number, default: 0 },
      updatedAt: Date
    },
    q4: {
      actual: mongoose.Schema.Types.Mixed,
      status: { type: String, enum: ['not_started', 'on_track', 'completed', 'at_risk'], default: 'not_started' },
      score: { type: Number, default: 0 },
      updatedAt: Date
    }
  }
});

const auditLogSchema = new mongoose.Schema({
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  field: String,
  oldValue: mongoose.Schema.Types.Mixed,
  newValue: mongoose.Schema.Types.Mixed,
  reason: String,
  timestamp: { type: Date, default: Date.now }
});

const goalSheetSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cycle: { type: String, required: true, default: () => new Date().getFullYear().toString() },

  goals: [goalItemSchema],

  status: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'approved', 'rework_requested'],
    default: 'draft'
  },

  isLocked: { type: Boolean, default: false },

  // Manager feedback
  managerComment: { type: String },
  approvedAt: { type: Date },
  submittedAt: { type: Date },

  // Weighted overall score per quarter
  overallScores: {
    q1: { type: Number, default: 0 },
    q2: { type: Number, default: 0 },
    q3: { type: Number, default: 0 },
    q4: { type: Number, default: 0 }
  },

  // Check-in records
  checkins: [{
    quarter: { type: String, enum: ['q1', 'q2', 'q3', 'q4'] },
    conductedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    comment: String,
    completedAt: Date
  }],

  // Audit trail
  auditLog: [auditLogSchema]

}, { timestamps: true });

// Compute progress score for a goal
goalSheetSchema.statics.computeScore = function(uomType, target, actual) {
  if (actual === null || actual === undefined) return 0;

  switch (uomType) {
    case 'min': // Higher is better
      return Math.min((actual / target) * 100, 150); // cap at 150%
    case 'max': // Lower is better
      if (actual === 0) return 150;
      return Math.min((target / actual) * 100, 150);
    case 'zero': // Zero = success
      return actual === 0 ? 100 : 0;
    case 'timeline': {
      // actual and target are date strings
      const targetDate = new Date(target);
      const actualDate = new Date(actual);
      if (actualDate <= targetDate) return 100;
      const daysDiff = (actualDate - targetDate) / (1000 * 60 * 60 * 24);
      return Math.max(100 - (daysDiff * 2), 0); // -2% per day late
    }
    default:
      return 0;
  }
};

// Validate total weightage = 100
goalSheetSchema.methods.validateWeightage = function() {
  const total = this.goals.reduce((sum, g) => sum + g.weightage, 0);
  return Math.abs(total - 100) < 0.01;
};

// Compute overall weighted score for a quarter
goalSheetSchema.methods.computeOverallScore = function(quarter) {
  const GoalSheet = this.constructor;
  let totalWeightedScore = 0;
  let totalWeightage = 0;

  for (const goal of this.goals) {
    const qData = goal.achievements[quarter];
    const score = GoalSheet.computeScore(goal.uomType, goal.target, qData?.actual);
    goal.achievements[quarter].score = score;
    totalWeightedScore += score * goal.weightage;
    totalWeightage += goal.weightage;
  }

  this.overallScores[quarter] = totalWeightage > 0
    ? Math.round(totalWeightedScore / totalWeightage)
    : 0;

  return this.overallScores[quarter];
};

module.exports = mongoose.model('GoalSheet', goalSheetSchema);