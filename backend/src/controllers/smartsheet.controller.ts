import { Request, Response } from 'express';
import * as smartsheetService from '../services/smartsheet.service';

/**
 * GET /api/v1/admin/smartsheet/status
 * Get overall sync status
 */
export async function getSyncStatus(req: Request, res: Response) {
  try {
    const status = await smartsheetService.getSyncStatus();

    res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sync status',
      details: error.message,
    });
  }
}

/**
 * GET /api/v1/admin/smartsheet/failed
 * Get failed syncs
 */
export async function getFailedSyncs(req: Request, res: Response) {
  try {
    const failedSyncs = await smartsheetService.getFailedSyncs();

    res.json({
      success: true,
      data: failedSyncs,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch failed syncs',
      details: error.message,
    });
  }
}

/**
 * POST /api/v1/admin/smartsheet/sync/:type
 * Trigger manual sync
 */
export async function triggerSync(req: Request, res: Response) {
  try {
    const { type } = req.params;

    let result;

    switch (type) {
      case 'users':
        result = await smartsheetService.syncAllUsers();
        break;
      case 'rsvps':
        result = await smartsheetService.syncAllRsvps();
        break;
      case 'connections':
        result = await smartsheetService.syncAllConnections();
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid sync type. Must be: users, rsvps, or connections',
        });
    }

    res.json({
      success: true,
      data: result,
      message: `Synced ${result.successful} of ${result.total} ${type}`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to trigger sync',
      details: error.message,
    });
  }
}

/**
 * POST /api/v1/admin/smartsheet/retry/:id
 * Retry failed sync
 */
export async function retrySync(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await smartsheetService.retrySyncItem(id);

    if (result.success) {
      res.json({
        success: true,
        data: result,
        message: 'Sync retry successful',
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Sync retry failed',
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to retry sync',
      details: error.message,
    });
  }
}

/**
 * DELETE /api/v1/admin/smartsheet/clear-failed
 * Clear all failed syncs
 */
export async function clearFailedSyncs(req: Request, res: Response) {
  try {
    const count = await smartsheetService.clearFailedSyncs();

    res.json({
      success: true,
      data: { count },
      message: `Cleared ${count} failed syncs`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to clear failed syncs',
      details: error.message,
    });
  }
}
