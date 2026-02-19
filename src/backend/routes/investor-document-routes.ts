/**
 * Investor Document Routes — KYC Document Upload & Management
 */

import express from 'express';
import multer from 'multer';
import { asyncHandler } from '../middleware/async-handler.js';
import {
  uploadDocument,
  getDocumentsByInvestor,
  getDocumentFile,
  verifyDocument,
  rejectDocument,
  removeDocument,
} from '../services/investor-document-service.js';
import { ValidationError } from '../errors.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf', 'image/jpeg', 'image/png', 'image/tiff',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPEG, PNG, TIFF, DOC, and DOCX files are accepted'));
    }
  },
});

const router = express.Router();

/** GET /api/investor-documents/:investorId — List documents for an investor */
router.get('/:investorId', asyncHandler(async (req, res) => {
  const docs = await getDocumentsByInvestor(req.params.investorId);
  res.json(docs);
}));

/** POST /api/investor-documents/:investorId/upload — Upload a document */
router.post('/:investorId/upload', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ValidationError('No file uploaded. Send a file as multipart/form-data with field name "file".');
  }

  const documentType = req.body.document_type;
  if (!documentType) {
    throw new ValidationError('document_type is required');
  }

  const doc = await uploadDocument({
    investor_id: req.params.investorId,
    document_type: documentType,
    filename: req.file.originalname,
    mime_type: req.file.mimetype,
    file_size: req.file.size,
    file_data: req.file.buffer,
    expiry_date: req.body.expiry_date || undefined,
    notes: req.body.notes || undefined,
    uploaded_by: (req as express.Request & { user?: { userId?: string } }).user?.userId,
  });

  res.status(201).json(doc);
}));

/** GET /api/investor-documents/file/:documentId — Download document file */
router.get('/file/:documentId', asyncHandler(async (req, res) => {
  const { document, file_data } = await getDocumentFile(req.params.documentId);

  res.setHeader('Content-Type', document.mime_type);
  res.setHeader('Content-Disposition', `attachment; filename="${document.filename}"`);
  res.setHeader('Content-Length', String(document.file_size));
  res.send(file_data);
}));

/** PATCH /api/investor-documents/file/:documentId/verify — Verify a document */
router.patch('/file/:documentId/verify', asyncHandler(async (req, res) => {
  const userId = (req as express.Request & { user?: { userId?: string } }).user?.userId || '';
  const doc = await verifyDocument(req.params.documentId, userId);
  res.json(doc);
}));

/** PATCH /api/investor-documents/file/:documentId/reject — Reject a document */
router.patch('/file/:documentId/reject', asyncHandler(async (req, res) => {
  const doc = await rejectDocument(req.params.documentId);
  res.json(doc);
}));

/** DELETE /api/investor-documents/file/:documentId — Delete a document */
router.delete('/file/:documentId', asyncHandler(async (req, res) => {
  await removeDocument(req.params.documentId);
  res.status(204).send();
}));

export default router;
