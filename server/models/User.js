import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true, minlength: 3, maxlength: 30 },
    // Lower-cased copy used for case-insensitive uniqueness.
    usernameLower: { type: String, required: true, unique: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    // Incremented on password change / logout-everywhere to invalidate issued tokens.
    tokenVersion: { type: Number, default: 0, select: false },
    preferences: {
      // Whether movies / OVAs count as "next up" in Continue Watching.
      includeSpecials: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);

userSchema.pre('validate', function setLower() {
  if (this.username) this.usernameLower = this.username.toLowerCase();
});

userSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    username: this.username,
    email: this.email,
    preferences: { includeSpecials: this.preferences?.includeSpecials ?? true },
    createdAt: this.createdAt,
  };
};

export const User = mongoose.model('User', userSchema);
