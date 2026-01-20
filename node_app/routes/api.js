const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const formulaController = require('../controllers/formulaController');
const systemController = require('../controllers/systemController');
const requestController = require('../controllers/requestController');
const authController = require('../controllers/authController');

// All API routes require auth
router.use(ensureAuthenticated);


// Formula Routes
router.post('/saveFormula', formulaController.saveFormula);
router.post('/getSavedFormulas', formulaController.getSavedFormulas);
router.post('/getFormulaDetails', formulaController.getFormulaDetails);
router.post('/updateFormulaStatus', formulaController.updateFormulaStatus);
router.post('/getMultipleFormulas', formulaController.getMultipleFormulas);


// System Routes
router.get('/getDashboardStats', systemController.getDashboardStats); // GAS uses run.getDashboardStats()
router.post('/logAction', systemController.logAction);
router.get('/getSystemSettings', systemController.getSystemSettings);
router.post('/saveSystemSetting', systemController.saveSystemSetting);

// Auth Routes
router.get('/getCurrentUserAuth', authController.getCurrentUserAuth);
router.get('/getAllUserRoles', authController.getAllUserRoles);
router.post('/saveUserRole', authController.saveUserRole);
router.post('/deleteUserRole', authController.deleteUserRole);

// Request Routes
router.post('/saveRequest', requestController.saveRequest);
router.get('/getAllRequests', requestController.getAllRequests); // GAS uses run.getAllRequests()
router.get('/getPendingRequests', requestController.getPendingRequests);
router.post('/attendRequest', requestController.attendRequest);
router.post('/syncUserPermissions', requestController.syncUserPermissions);


module.exports = router;

