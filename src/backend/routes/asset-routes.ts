import express from 'express';
import {
  createAsset,
  getAsset,
  getAllAssets,
  getAssetUtilization,
  deleteAsset,
  updateAsset,
} from '../services/index.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireFields, requireFound } from '../middleware/validate.js';

const router = express.Router();

router.post('/', asyncHandler(async (req, res) => {
  requireFields(req.body, ['name', 'asset_type', 'total_units']);
  const { name, asset_type, total_units, fund_structure_id, unit_price } = req.body;

  const asset = await createAsset({
    name,
    asset_type,
    total_units: Number(total_units),
    fund_structure_id,
    unit_price
  });

  res.status(201).json(asset);
}));

router.get('/', asyncHandler(async (_req, res) => {
  const assets = await getAllAssets();
  res.json(assets);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const asset = requireFound(await getAsset(req.params.id), 'Asset', req.params.id);
  res.json(asset);
}));

router.get('/:id/utilization', asyncHandler(async (req, res) => {
  const utilization = requireFound(
    await getAssetUtilization(req.params.id),
    'Asset',
    req.params.id
  );

  res.json({
    ...utilization,
    asset_id: utilization.asset.id,
    asset_name: utilization.asset.name,
    total_units: utilization.asset.total_units,
  });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await deleteAsset(req.params.id);
  res.status(204).send();
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const { name, asset_type, total_units } = req.body;

  const updated = await updateAsset(req.params.id, {
    name,
    asset_type,
    total_units: total_units !== undefined ? Number(total_units) : undefined,
  });

  res.json(updated);
}));

export default router;
