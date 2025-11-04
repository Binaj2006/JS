const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g. "Elf"
  linkedTags: [String] // e.g. ["#elf", "#elven", "#forest"]
});

module.exports = mongoose.model('Category', categorySchema);