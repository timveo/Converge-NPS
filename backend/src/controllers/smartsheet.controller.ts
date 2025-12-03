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

// =============================================================================
// DATA IMPORT ENDPOINTS
// =============================================================================

/**
 * POST /api/v1/admin/smartsheet/import/sessions
 * Import session schedule from Smartsheet
 */
export async function importSessions(req: Request, res: Response) {
  try {
    const result = await smartsheetService.importSessions();

    const successCount = result.imported + result.updated;
    const totalProcessed = successCount + result.failed;

    res.json({
      success: true,
      data: result,
      message: `Import complete: ${result.imported} new, ${result.updated} updated, ${result.failed} failed out of ${totalProcessed} total rows`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to import sessions',
      details: error.message,
    });
  }
}

/**
 * POST /api/v1/admin/smartsheet/import/projects
 * Import research projects from Smartsheet
 */
export async function importProjects(req: Request, res: Response) {
  try {
    const result = await smartsheetService.importProjects();

    const successCount = result.imported + result.updated;
    const totalProcessed = successCount + result.failed;

    res.json({
      success: true,
      data: result,
      message: `Import complete: ${result.imported} new, ${result.updated} updated, ${result.failed} failed out of ${totalProcessed} total rows`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to import projects',
      details: error.message,
    });
  }
}

/**
 * POST /api/v1/admin/smartsheet/import/opportunities
 * Import opportunities from Smartsheet
 */
export async function importOpportunities(req: Request, res: Response) {
  try {
    const result = await smartsheetService.importOpportunities();

    const successCount = result.imported + result.updated;
    const totalProcessed = successCount + result.failed;

    res.json({
      success: true,
      data: result,
      message: `Import complete: ${result.imported} new, ${result.updated} updated, ${result.failed} failed out of ${totalProcessed} total rows`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to import opportunities',
      details: error.message,
    });
  }
}

/**
 * POST /api/v1/admin/smartsheet/import/partners
 * Import industry partners from Smartsheet
 */
export async function importPartners(req: Request, res: Response) {
  try {
    const result = await smartsheetService.importPartners();

    const successCount = result.imported + result.updated;
    const totalProcessed = successCount + result.failed;

    res.json({
      success: true,
      data: result,
      message: `Import complete: ${result.imported} new, ${result.updated} updated, ${result.failed} failed out of ${totalProcessed} total rows`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to import partners',
      details: error.message,
    });
  }
}

/**
 * POST /api/v1/admin/smartsheet/import/attendees
 * Import registered attendees from Smartsheet
 */
export async function importAttendees(req: Request, res: Response) {
  try {
    const result = await smartsheetService.importAttendees();

    const successCount = result.imported + result.updated;
    const totalProcessed = successCount + result.failed;

    res.json({
      success: true,
      data: result,
      message: `Import complete: ${result.imported} new, ${result.updated} updated, ${result.failed} failed out of ${totalProcessed} total rows`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to import attendees',
      details: error.message,
    });
  }
}

/**
 * POST /api/v1/admin/smartsheet/import/all
 * Import all data types from Smartsheet
 */
export async function importAll(req: Request, res: Response) {
  try {
    const results = {
      sessions: { imported: 0, updated: 0, failed: 0, errors: [] },
      projects: { imported: 0, updated: 0, failed: 0, errors: [] },
      opportunities: { imported: 0, updated: 0, failed: 0, errors: [] },
      partners: { imported: 0, updated: 0, failed: 0, errors: [] },
      attendees: { imported: 0, updated: 0, failed: 0, errors: [] },
    };

    const errors: string[] = [];

    // Import sessions
    try {
      results.sessions = await smartsheetService.importSessions();
    } catch (error: any) {
      errors.push(`Sessions: ${error.message}`);
    }

    // Import projects
    try {
      results.projects = await smartsheetService.importProjects();
    } catch (error: any) {
      errors.push(`Projects: ${error.message}`);
    }

    // Import opportunities
    try {
      results.opportunities = await smartsheetService.importOpportunities();
    } catch (error: any) {
      errors.push(`Opportunities: ${error.message}`);
    }

    // Import partners
    try {
      results.partners = await smartsheetService.importPartners();
    } catch (error: any) {
      errors.push(`Partners: ${error.message}`);
    }

    // Import attendees
    try {
      results.attendees = await smartsheetService.importAttendees();
    } catch (error: any) {
      errors.push(`Attendees: ${error.message}`);
    }

    const totalImported =
      results.sessions.imported +
      results.projects.imported +
      results.opportunities.imported +
      results.partners.imported +
      results.attendees.imported;

    const totalUpdated =
      results.sessions.updated +
      results.projects.updated +
      results.opportunities.updated +
      results.partners.updated +
      results.attendees.updated;

    const totalFailed =
      results.sessions.failed +
      results.projects.failed +
      results.opportunities.failed +
      results.partners.failed +
      results.attendees.failed;

    res.json({
      success: errors.length === 0,
      data: results,
      summary: {
        totalImported,
        totalUpdated,
        totalFailed,
      },
      errors,
      message: errors.length === 0
        ? `All data imported successfully: ${totalImported} new, ${totalUpdated} updated`
        : `Import completed with ${errors.length} errors: ${totalImported} new, ${totalUpdated} updated, ${totalFailed} failed`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to import all data',
      details: error.message,
    });
  }
}
