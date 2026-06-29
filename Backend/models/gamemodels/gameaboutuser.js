const mongoose = require("mongoose");

const gameAboutUserSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "GameUser",
        required: true,
        unique: true
    },
    avatarUrl: {
        type: String,
        trim: true,
        default: ""
    },
    about: {
        type: String,
        trim: true,
        default: ""
    },
    location: {
        type: String,
        trim: true,
        default: ""
    }
}, {
    timestamps: true,
    collection: "gameaboutusers"
});

module.exports = mongoose.models.GameAboutUser || mongoose.model("GameAboutUser", gameAboutUserSchema);
