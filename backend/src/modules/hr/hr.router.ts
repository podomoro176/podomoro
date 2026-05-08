import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requireRole } from '../../middleware/requireRole';
import { requireBranch } from '../../middleware/requireBranch';
import * as controller from './hr.controller';

const router = Router();
router.use(authenticate, requireBranch);

// Employees — manager/owner only
router.get('/employees', requireRole('manager', 'owner'), controller.listEmployees);
router.post('/employees', requireRole('manager', 'owner'), controller.createEmployee);
router.get('/employees/:id', requireRole('manager', 'owner'), controller.getEmployee);
router.put('/employees/:id', requireRole('manager', 'owner'), controller.updateEmployee);
router.delete('/employees/:id', requireRole('manager', 'owner'), controller.deleteEmployee);

// Schedule
router.get('/schedule', requireRole('manager', 'owner'), controller.getSchedule);
router.post('/shifts', requireRole('manager', 'owner'), controller.createShift);
router.get('/shifts/my', requireRole('staff', 'cashier', 'manager', 'owner'), controller.getMyShifts);

// Availability
router.post('/availability', requireRole('staff', 'cashier', 'manager', 'owner'), controller.submitAvailability);
router.get('/availability', requireRole('manager', 'owner'), controller.listAvailability);

// Attendance
router.post('/attendance/clock-in', requireRole('staff', 'cashier', 'manager'), controller.clockIn);
router.post('/attendance/clock-out', requireRole('staff', 'cashier', 'manager'), controller.clockOut);
router.get('/attendance/variance', requireRole('manager', 'owner'), controller.getVariance);

// Leave
router.post('/leave', requireRole('staff', 'cashier', 'manager'), controller.submitLeave);
router.put('/leave/:id', requireRole('manager', 'owner'), controller.reviewLeave);

export default router;
