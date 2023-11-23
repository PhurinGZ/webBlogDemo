// controller/user.js
import express from 'express';
import User from '../model/userModel';

const router = express.Router();

export const userProfile = async (req, res) => {
  try {
    const userEmail = req.query.email; 

    const userData = await User.findOne({ email: userEmail });

    if (!userData) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ profile: userData });
  } catch (error) {
    console.error('Error fetching user profile data:', error);
    res.status(500).json({ message: 'Error fetching user profile data', error: error.message });
  }
};


export default router;
