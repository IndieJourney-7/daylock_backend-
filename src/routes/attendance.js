/**
 * Attendance Routes
 * /api/attendance
 */

import { Router } from 'express'
import { attendanceService } from '../services/index.js'

const router = Router()

/**
 * GET /api/attendance
 * Get all attendance for current user
 */
router.get('/', async (req, res, next) => {
  try {
    const { fromDate, toDate, limit } = req.query
    const attendance = await attendanceService.getAllUserAttendance(req.user.id, {
      fromDate,
      toDate,
      limit: limit ? parseInt(limit) : undefined
    })
    res.json(attendance)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/attendance/room/:roomId
 * Get attendance for a specific room
 */
router.get('/room/:roomId', async (req, res, next) => {
  try {
    const attendance = await attendanceService.getUserAttendance(
      req.params.roomId,
      req.user.id
    )
    res.json(attendance)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/attendance/room/:roomId/today
 * Get today's attendance status for a room
 */
router.get('/room/:roomId/today', async (req, res, next) => {
  try {
    const status = await attendanceService.getTodayStatus(
      req.params.roomId,
      req.user.id
    )
    res.json(status)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/attendance/room/:roomId/stats
 * Get room attendance stats
 */
router.get('/room/:roomId/stats', async (req, res, next) => {
  try {
    const stats = await attendanceService.getRoomStats(
      req.params.roomId,
      req.user.id
    )
    res.json(stats)
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/attendance/submit
 * Submit attendance with proof
 */
router.post('/submit', async (req, res, next) => {
  try {
    const { room_id, proof_url, note } = req.body
    
    if (!room_id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'room_id is required'
      })
    }
    
    const attendance = await attendanceService.submitProof(
      room_id,
      req.user.id,
      proof_url,
      note
    )
    res.status(201).json(attendance)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/attendance/pending
 * Get all pending proofs for admin (across all their rooms)
 */
router.get('/pending', async (req, res, next) => {
  try {
    const proofs = await attendanceService.getAllPendingProofsForAdmin(req.user.id)
    res.json(proofs)
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/attendance/pending/:roomId
 * Get pending proofs for a specific room (admin view)
 */
router.get('/pending/:roomId', async (req, res, next) => {
  try {
    const proofs = await attendanceService.getPendingProofs(req.params.roomId)
    res.json(proofs)
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/attendance/:attendanceId/approve
 * Approve attendance (admin action)
 */
router.post('/:attendanceId/approve', async (req, res, next) => {
  try {
    const attendance = await attendanceService.approveAttendance(
      req.params.attendanceId,
      req.user.id
    )
    res.json(attendance)
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/attendance/:attendanceId/reject
 * Reject attendance (admin action)
 */
router.post('/:attendanceId/reject', async (req, res, next) => {
  try {
    const { reason } = req.body
    const attendance = await attendanceService.rejectAttendance(
      req.params.attendanceId,
      req.user.id,
      reason
    )
    res.json(attendance)
  } catch (error) {
    next(error)
  }
})

export default router
