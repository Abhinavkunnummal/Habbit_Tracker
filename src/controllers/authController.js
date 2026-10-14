const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Generate signed JWT token.
 * @param {string} id User ID
 * @returns {string} JWT Token
 */
const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'super_secret_jwt_key_habit_tracker_production_ready_9921',
    {
      expiresIn: process.env.JWT_EXPIRE || '30d'
    }
  );
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { username, email, password, displayName } = req.body;

    // Check existing email
    const emailExists = await User.findOne({ email: email.toLowerCase() });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists'
      });
    }

    // Check existing username
    const usernameExists = await User.findOne({ username: username.toLowerCase() });
    if (usernameExists) {
      return res.status(400).json({
        success: false,
        message: 'This username is already taken'
      });
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
      displayName: displayName || username
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email/username and password'
      });
    }

    const query = emailOrUsername.includes('@')
      ? { email: emailOrUsername.toLowerCase() }
      : { username: emailOrUsername.toLowerCase() };

    const user = await User.findOne(query).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current authenticated user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update current user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = async (req, res, next) => {
  try {
    const { displayName, avatarUrl } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (displayName !== undefined) user.displayName = displayName;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login or register via Google Authentication
 * @route   POST /api/auth/google
 * @access  Public
 */
const googleLogin = async (req, res, next) => {
  try {
    const { email, name, picture, googleId, credential } = req.body;

    let userEmail = email;
    let userName = name;
    let userAvatar = picture;

    // Decode JWT payload if credential is provided
    if (credential) {
      try {
        const payloadBase64 = credential.split('.')[1];
        const decodedJson = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
        userEmail = decodedJson.email || userEmail;
        userName = decodedJson.name || userName;
        userAvatar = decodedJson.picture || userAvatar;
      } catch (_) {}
    }

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        message: 'Google email is required'
      });
    }

    // Check if user exists
    let user = await User.findOne({ email: userEmail.toLowerCase() });

    if (!user) {
      // Create user
      const baseUsername = (userEmail.split('@')[0] || 'google_user')
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .slice(0, 20);
      const uniqueSuffix = Math.floor(Math.random() * 900 + 100);
      const username = `${baseUsername}_${uniqueSuffix}`;

      user = await User.create({
        username,
        email: userEmail.toLowerCase(),
        displayName: userName || baseUsername,
        avatarUrl: userAvatar || '',
        password: `google_oauth_${Math.random().toString(36).substring(2, 15)}`
      });
    } else {
      if (userAvatar && !user.avatarUrl) {
        user.avatarUrl = userAvatar;
        await user.save();
      }
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Fast login or sign-in with Name only
 * @route   POST /api/auth/name-login
 * @access  Public
 */
const nameLogin = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }

    const cleanName = name.trim();
    const cleanUsername = cleanName.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 25);

    // Find existing user by username or displayName
    let user = await User.findOne({
      $or: [
        { username: cleanUsername },
        { displayName: new RegExp(`^${cleanName}$`, 'i') }
      ]
    });

    if (!user) {
      // Auto-create account for this name
      user = await User.create({
        username: cleanUsername.length >= 3 ? cleanUsername : `${cleanUsername}_${Math.floor(Math.random() * 900 + 100)}`,
        email: `${cleanUsername}_${Math.floor(Math.random() * 9000 + 1000)}@habit.app`,
        displayName: cleanName,
        password: `name_pass_${Math.random().toString(36).substring(2, 15)}`
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  googleLogin,
  nameLogin
};
