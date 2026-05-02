const Subscription = require('../models/Subscription');

const subscribe = async (req, res) => {
  try {
    const { email } = req.body;

    const existing = await Subscription.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Already subscribed' });
    }

    await Subscription.create({ email });
    res.status(201).json({ message: 'Subscribed successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { subscribe };
