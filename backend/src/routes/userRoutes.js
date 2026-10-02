const express = require('express');

const {
  getUsers,
  createUser,
  updateUser,
  resetPassword,
  deleteUser,
} = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.put('/:id/password', resetPassword);
router.delete('/:id', deleteUser);

module.exports = router;
