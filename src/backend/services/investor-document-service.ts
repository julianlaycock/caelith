/**
 * Investor Document Service — KYC Document Business Logic
 */

import {
  createInvestorDocument,
  findDocumentsByInvestor,
  findDocumentById,
  updateDocumentStatus,
  deleteDocument,
  type InvestorDocument,
  type CreateInvestorDocumentInput,
} from '../repositories/investor-document-repository.js';
import { createEvent } from '../repositories/index.js';
import { ValidationError, NotFoundError } from '../errors.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/tiff',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export async function uploadDocument(
  input: CreateInvestorDocumentInput
): Promise<InvestorDocument> {
  // Validate file size
  if (input.file_size > MAX_FILE_SIZE) {
    throw new ValidationError(`File size ${input.file_size} exceeds maximum of ${MAX_FILE_SIZE} bytes (10MB)`);
  }

  // Validate mime type
  if (!ALLOWED_MIME_TYPES.has(input.mime_type)) {
    throw new ValidationError(
      `File type ${input.mime_type} is not allowed. Accepted: PDF, JPEG, PNG, TIFF, DOC, DOCX`
    );
  }

  const doc = await createInvestorDocument(input);

  await createEvent({
    event_type: 'investor.updated',
    entity_type: 'investor',
    entity_id: input.investor_id,
    payload: {
      action: 'document_uploaded',
      document_id: doc.id,
      document_type: doc.document_type,
      filename: doc.filename,
      file_size: doc.file_size,
    },
  });

  return doc;
}

export async function getDocumentsByInvestor(
  investorId: string
): Promise<InvestorDocument[]> {
  return findDocumentsByInvestor(investorId);
}

export async function getDocumentFile(
  documentId: string
): Promise<{ document: InvestorDocument; file_data: Buffer }> {
  const doc = await findDocumentById(documentId);
  if (!doc) throw new NotFoundError('Document', documentId);
  return { document: doc, file_data: doc.file_data };
}

export async function verifyDocument(
  documentId: string,
  verifiedBy: string
): Promise<InvestorDocument> {
  const doc = await findDocumentById(documentId);
  if (!doc) throw new NotFoundError('Document', documentId);

  const updated = await updateDocumentStatus(documentId, 'verified', verifiedBy);
  if (!updated) throw new NotFoundError('Document', documentId);

  await createEvent({
    event_type: 'investor.updated',
    entity_type: 'investor',
    entity_id: doc.investor_id,
    payload: {
      action: 'document_verified',
      document_id: documentId,
      document_type: doc.document_type,
      verified_by: verifiedBy,
    },
  });

  return updated;
}

export async function rejectDocument(
  documentId: string
): Promise<InvestorDocument> {
  const doc = await findDocumentById(documentId);
  if (!doc) throw new NotFoundError('Document', documentId);

  const updated = await updateDocumentStatus(documentId, 'rejected');
  if (!updated) throw new NotFoundError('Document', documentId);

  return updated;
}

export async function removeDocument(
  documentId: string
): Promise<void> {
  const doc = await findDocumentById(documentId);
  if (!doc) throw new NotFoundError('Document', documentId);

  await deleteDocument(documentId);

  await createEvent({
    event_type: 'investor.updated',
    entity_type: 'investor',
    entity_id: doc.investor_id,
    payload: {
      action: 'document_deleted',
      document_id: documentId,
      document_type: doc.document_type,
    },
  });
}
