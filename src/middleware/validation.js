/**
 * Input Validation Middleware
 * Validates and sanitizes user input
 */

import { body, param, query, validationResult } from 'express-validator'

/**
 * Validation error handler
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation Error',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    })
  }
  next()
}

/**
 * UUID validation
 */
export const validateUUID = (field, location = 'param') => {
  const validator = location === 'param' ? param(field) : 
                    location === 'query' ? query(field) : body(field)
  
  return validator
    .isUUID()
    .withMessage(`${field} must be a valid UUID`)
}

/**
 * Room creation validation
 */
export const validateRoomCreation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Room name is required')
    .isLength({ min: 1, max: 100 }).withMessage('Room name must be 1-100 characters'),
  body('emoji')
    .optional()
    .isLength({ max: 10 }).withMessage('Emoji must be max 10 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 }).withMessage('Description must be max 500 characters'),
  validate
]

/**
 * Room update validation
 */
export const validateRoomUpdate = [
  validateUUID('roomId', 'param'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('Room name must be 1-100 characters'),
  body('emoji')
    .optional()
    .isLength({ max: 10 }).withMessage('Emoji must be max 10 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 }).withMessage('Description must be max 500 characters'),
  body('time_start')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format (HH:MM)'),
  body('time_end')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format (HH:MM)'),
  validate
]

/**
 * Attendance submission validation
 */
export const validateAttendanceSubmit = [
  body('room_id')
    .notEmpty().withMessage('room_id is required')
    .isUUID().withMessage('room_id must be a valid UUID'),
  body('proof_url')
    .optional()
    .isURL().withMessage('proof_url must be a valid URL'),
  body('note')
    .optional()
    .isLength({ max: 500 }).withMessage('Note must be max 500 characters')
    .trim(),
  validate
]

/**
 * Attendance review validation
 */
export const validateAttendanceReview = [
  validateUUID('attendanceId', 'param'),
  body('quality_rating')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('Quality rating must be 1-5'),
  body('admin_feedback')
    .optional()
    .isLength({ max: 500 }).withMessage('Feedback must be max 500 characters')
    .trim(),
  body('rejection_reason')
    .optional()
    .isLength({ max: 500 }).withMessage('Rejection reason must be max 500 characters')
    .trim(),
  validate
]

/**
 * Invite code validation
 */
export const validateInviteCode = [
  body('invite_code')
    .notEmpty().withMessage('invite_code is required')
    .matches(/^[A-Z]{3}-[A-Z0-9]{4}$/).withMessage('Invalid invite code format'),
  validate
]

/**
 * Rule creation validation
 */
export const validateRuleCreation = [
  body('room_id')
    .notEmpty().withMessage('room_id is required')
    .isUUID().withMessage('room_id must be a valid UUID'),
  body('text')
    .trim()
    .notEmpty().withMessage('Rule text is required')
    .isLength({ min: 1, max: 500 }).withMessage('Rule text must be 1-500 characters'),
  body('group_title')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Group title must be max 100 characters'),
  validate
]

export default {
  validate,
  validateUUID,
  validateRoomCreation,
  validateRoomUpdate,
  validateAttendanceSubmit,
  validateAttendanceReview,
  validateInviteCode,
  validateRuleCreation
}
