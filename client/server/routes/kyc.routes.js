const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');
const { getKycStatus, uploadId, uploadAddress, submitKyc } = require('../controllers/kyc.controller');

const router = express.Router();

router.use(protect);

router.get('/status', getKycStatus);
router.post('/submit', submitKyc);

router.post(
  '/upload-id',
  upload.fields([
    { name: 'front', maxCount: 1 },
    { name: 'back', maxCount: 1 },
  ]),
  uploadId
);

router.post('/upload-address', upload.single('document'), uploadAddress);

module.exports = router;
