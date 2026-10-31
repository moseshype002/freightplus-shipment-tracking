import { Router, Response } from 'express';
import { ShipmentModel, AuditLogModel } from '../db/models.js';
import { authenticateToken, requireAdmin, optionalAuth, AuthenticatedRequest } from '../auth.js';
import { CreateShipmentInput, AddMilestoneInput, BookingStatus, PaymentStatus, MovementStatus, HoldShipmentInput, ResumeShipmentInput } from '../../types/shipment.js';
import crypto from 'crypto';
const router = Router();

// GET /api/shipments
// Customers strictly see ONLY their own shipments. Admins see all.
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const movementStatus = req.query.movementStatus as string | undefined;
    const bookingStatus = req.query.bookingStatus as string | undefined;
    const search = req.query.search as string | undefined;

    const isAdmin = req.user?.role === 'admin';

    const filter: Record<string, any> = {};

    if (!isAdmin) {
      filter.userId = req.user?.id;
    }

    if (movementStatus) filter.movementStatus = movementStatus;
    if (bookingStatus) filter.bookingStatus = bookingStatus;

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { trackingNumber: { $regex: search, $options: 'i' } },
        { consignmentNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const shipments = await ShipmentModel.find(filter)
      .sort({ updatedAt: -1 })
      .lean()
      .exec();

    res.json({
      shipments,
      count: shipments.length,
    });
  } catch (error) {
    console.error('MongoDB shipment retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve shipments.' });
  }
});

// GET /api/shipments/:id
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const shipment = await ShipmentModel.findOne({ id: req.params.id })
      .lean()
      .exec();

    if (!shipment) {
      res.status(404).json({ error: 'Shipment not found.' });
      return;
    }

    if (req.user?.role !== 'admin' && shipment.userId !== req.user?.id) {
      res.status(403).json({
        error: 'Access denied: You are not authorized to view this consignment.',
      });
      return;
    }

    res.json({ shipment });
  } catch (error) {
    console.error('MongoDB shipment detail error:', error);
    res.status(500).json({ error: 'Failed to retrieve shipment details.' });
  }
});
// POST /api/shipments — Customer or Admin creates booking
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const input = req.body as CreateShipmentInput;

    if (!input.title || !input.serviceType || !input.sender || !input.recipient || !input.cargoDetails) {
      res.status(400).json({
        error: 'Missing required fields: title, serviceType, sender, recipient, and cargoDetails are required.',
      });
      return;
    }

    if (!input.sender.city || !input.sender.country || !input.recipient.city || !input.recipient.country) {
      res.status(400).json({
        error: 'Sender and Recipient must include city and country.',
      });
      return;
    }

    const userId = req.user!.id;
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const countryCode = (input.recipient.country.slice(0, 2) || 'GL').toUpperCase();

    const trackingNumber = `FP-${randNum}-${countryCode}`;
    const consignmentNumber = `CN-2026-${randNum}`;
    const trackingToken = crypto.randomBytes(24).toString('hex');
    const now = new Date().toISOString();

    const perKgRate =
      input.serviceType === 'Air Express' ? 8.5 :
      input.serviceType === 'Cold Chain Express' ? 13.5 :
      input.serviceType === 'Standard Freight' ? 3.2 : 1.4;

    const baseHandling =
      input.serviceType === 'Air Express' ? 120 : 65;

    const calculatedAmount = Math.round(
      baseHandling + input.cargoDetails.weightKg * perKgRate
    );

    const deliveryDays =
      input.serviceType === 'Air Express' ? 2 :
      input.serviceType === 'Cold Chain Express' ? 3 :
      input.serviceType === 'Standard Freight' ? 5 : 14;

    const estimatedDelivery = new Date(
      Date.now() + deliveryDays * 24 * 3600 * 1000
    ).toISOString();

    const originHub = {
      name: `${input.sender.city} Cargo Gateway`,
      city: input.sender.city,
      country: input.sender.country,
      code: (input.sender.city.slice(0, 3) || 'ORG').toUpperCase(),
      lat: input.sender.lat || 50.0,
      lng: input.sender.lng || 8.5,
    };

    const destinationHub = {
      name: `${input.recipient.city} International Terminal`,
      city: input.recipient.city,
      country: input.recipient.country,
      code: (input.recipient.city.slice(0, 3) || 'DST').toUpperCase(),
      lat: input.recipient.lat || 40.7,
      lng: input.recipient.lng || -74.0,
    };

    const newShipment = {
      id: `shp-${Date.now()}`,
      trackingNumber,
      consignmentNumber,
      trackingToken,
      title: input.title,
      bookingStatus: 'Awaiting Admin Review',
      paymentStatus: 'Awaiting Payment',
      movementStatus: 'Awaiting Dispatch',
      status: 'Awaiting Dispatch',
      serviceType: input.serviceType,
      sender: input.sender,
      recipient: input.recipient,
      originHub,
      destinationHub,
      currentLocation: {
        name: `${input.sender.city} Consignment Collection Point`,
        city: input.sender.city,
        country: input.sender.country,
        lat: originHub.lat,
        lng: originHub.lng,
      },
      cargoDetails: input.cargoDetails,
      carrier: {
        name: input.carrierName || 'Freight Plus Logistics Network',
        serviceLevel: input.serviceType,
        sealNumber: `SEAL-${randNum}-A`,
      },
      pricing: {
        baseAmount: calculatedAmount,
        handlingFee: baseHandling,
        totalAmount: calculatedAmount,
        currency: 'USD',
        payer: input.payer || 'sender',
      },
      holdDetails: {
        isOnHold: false,
      },
      estimatedDelivery,
      dispatchDate: null,
      actualDelivery: null,
      signatureRequired: input.signatureRequired ?? true,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
      userId,
      milestones: [
        {
          id: `ms-${Date.now()}-1`,
          status: 'Awaiting Dispatch',
          title: 'Booking Received — Awaiting Admin Review',
          location: `${input.sender.city} Booking Portal`,
          city: input.sender.city,
          country: input.sender.country,
          timestamp: now,
          notes: `Consignment created with ${input.serviceType} service tier. Awaiting payment and dispatch authorization.`,
          operator: 'System Automation',
          completed: true,
          lat: originHub.lat,
          lng: originHub.lng,
        },
      ],
    };

    await ShipmentModel.create(newShipment);

    res.status(201).json({
      shipment: newShipment,
      trackingUrl: `/track?token=${trackingToken}`,
      message: `Consignment created successfully. Consignment ID: ${consignmentNumber}. Awaiting administrator review.`,
    });
  } catch (error) {
    console.error('MongoDB shipment creation error:', error);
    res.status(500).json({ error: 'Failed to book consignment.' });
  }
});

// ============================================================================
// ADMINISTRATOR EXCLUSIVE CONTROLS (Protected with requireAdmin)
// ============================================================================

// PATCH /api/shipments/:id/booking-status — Approve or Reject Booking
router.patch('/:id/booking-status', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { bookingStatus } = req.body;

    const shipment = await ShipmentModel.findOneAndUpdate(
      { id: req.params.id },
      {
        $set: {
          bookingStatus,
          updatedAt: new Date().toISOString(),
        },
      },
      { new: true, runValidators: true }
    ).lean().exec();

    if (!shipment) {
      res.status(404).json({ error: 'Shipment not found.' });
      return;
    }

await AuditLogModel.create({
  id: `audit-${Date.now()}`,
  adminId: req.user?.id || '',
  adminEmail: req.user?.email || '',
  action: 'BOOKING_STATUS_UPDATED',
  targetId: req.params.id,
  details: { bookingStatus },
  timestamp: new Date().toISOString(),
});

    res.json({ shipment });
  } catch (error) {
    console.error('MongoDB booking status update error:', error);
    res.status(500).json({ error: 'Failed to update booking status.' });
  }
});

// PATCH /api/shipments/:id/payment-status — Verify Payment
router.patch('/:id/payment-status', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { paymentStatus } = req.body;

    const shipment = await ShipmentModel.findOneAndUpdate(
      { id: req.params.id },
      {
        $set: {
          paymentStatus,
          updatedAt: new Date().toISOString(),
        },
      },
      { new: true, runValidators: true }
    ).lean().exec();

    if (!shipment) {
      res.status(404).json({ error: 'Shipment not found.' });
      return;
    }

    await AuditLogModel.create({
      id: `audit-${Date.now()}`,
      adminId: req.user?.id || '',
      adminEmail: req.user?.email || '',
      action: 'PAYMENT_STATUS_UPDATED',
      targetId: req.params.id,
      details: { paymentStatus },
      timestamp: new Date().toISOString(),
    });

    res.json({ shipment });
  } catch (error) {
    console.error('MongoDB payment status update error:', error);
    res.status(500).json({ error: 'Failed to update payment status.' });
  }
});

   // POST /api/shipments/:id/authorize-dispatch — Dispatch Authorization
router.post('/:id/authorize-dispatch', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { carrierFlightOrVessel } = req.body;

    const shipment = await ShipmentModel.findOne({ id }).lean().exec();

    if (!shipment) {
      res.status(404).json({ error: 'Shipment not found.' });
      return;
    }

    if (shipment.bookingStatus !== 'Approved') {
      res.status(400).json({
        error: 'Cannot authorize dispatch: Booking must be Approved by administrator first.',
      });
      return;
    }

    if (shipment.paymentStatus !== 'Paid') {
      res.status(400).json({
        error: 'Cannot authorize dispatch: Payment must be verified and marked Paid first.',
      });
      return;
    }

    const now = new Date().toISOString();
    const serviceType = shipment.serviceType;

    const journeyDurationSeconds =
      serviceType === 'Air Express'
        ? 2 * 24 * 60 * 60
        : serviceType === 'Cold Chain Express'
          ? 3 * 24 * 60 * 60
          : serviceType === 'Ocean Cargo'
            ? 16 * 24 * 60 * 60
            : 5 * 24 * 60 * 60;

    const updated = await ShipmentModel.findOneAndUpdate(
      { id },
      {
        $set: {
          movementStatus: 'In Transit',
          dispatchDate: now,
          journeyStartedAt: now,
          journeyDurationSeconds,
          journeyPausedAt: null,
          journeyPausedElapsedSeconds: 0,
          journeyProgressAtPause: 0,
          carrier: {
            ...shipment.carrier,
            vesselOrFlight: carrierFlightOrVessel || shipment.carrier?.vesselOrFlight,
          },
          updatedAt: now,
        },
        $push: {
          milestones: {
            id: `milestone-${Date.now()}`,
            status: 'In Transit',
            title: 'Consignment Dispatched from Origin Hub',
            location: shipment.originHub.name,
            city: shipment.originHub.city,
            country: shipment.originHub.country,
            notes: `Cargo tender approved. Transport carrier assigned: ${carrierFlightOrVessel || shipment.carrier?.name}.`,
            operator: req.user!.name,
            timestamp: now,
            completed: true,
          },
        },
      },
      { new: true, runValidators: true }
    ).lean().exec();

    if (!updated) {
      res.status(404).json({ error: 'Shipment not found.' });
      return;
    }

    await AuditLogModel.create({
      id: `audit-${Date.now()}`,
      adminId: req.user!.id,
      adminEmail: req.user!.email,
      action: 'AUTHORIZE_DISPATCH',
      targetId: id,
      details: { dispatchDate: now, carrierFlightOrVessel },
      timestamp: now,
    });

    res.json({
      shipment: updated,
      message: 'Shipment authorized for physical dispatch. Movement status updated to In Transit.',
    });
  } catch (error) {
    console.error('MongoDB dispatch authorization error:', error);
    res.status(500).json({ error: 'Failed to authorize dispatch.' });
  }
});
// POST /api/shipments/:id/hold — Place on Hold
router.post('/:id/hold', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason, customerExplanation } = req.body as HoldShipmentInput;

    if (!reason || !customerExplanation) {
      res.status(400).json({
        error: 'Internal reason and customer explanation are both required when placing a hold.',
      });
      return;
    }

    const shipment = await ShipmentModel.findOne({ id }).lean().exec();

    if (!shipment) {
      res.status(404).json({ error: 'Shipment not found.' });
      return;
    }

    const now = new Date().toISOString();
    let progressAtPause = 30;

    if (
      shipment.journeyStartedAt &&
      shipment.journeyDurationSeconds &&
      shipment.journeyDurationSeconds > 0
    ) {
      const startTime = new Date(shipment.journeyStartedAt).getTime();

      if (Number.isFinite(startTime)) {
        const elapsedSeconds = Math.max(
          0,
          (Date.now() - startTime) / 1000 -
            (shipment.journeyPausedElapsedSeconds ?? 0)
        );

        progressAtPause = Math.min(
          85,
          Math.max(
            30,
            Math.round(
              (elapsedSeconds / shipment.journeyDurationSeconds) * 100
            )
          )
        );
      }
    }

    const updated = await ShipmentModel.findOneAndUpdate(
      { id },
      {
        $set: {
          journeyPausedAt: now,
          journeyProgressAtPause: progressAtPause,
          movementStatus: 'On Hold',
          status: 'On Hold',
          holdDetails: {
            isOnHold: true,
            reason,
            customerExplanation,
            placedOnHoldAt: now,
          },
          updatedAt: now,
        },
        $push: {
          milestones: {
            id: `ms-hold-${Date.now()}`,
            status: 'On Hold',
            title: 'Operational Hold Placed',
            location: shipment.currentLocation.name,
            city: shipment.currentLocation.city,
            country: shipment.currentLocation.country,
            timestamp: now,
            notes: customerExplanation,
            operator: req.user!.name,
            completed: true,
            lat: shipment.currentLocation.lat,
            lng: shipment.currentLocation.lng,
          },
        },
      },
      { new: true, runValidators: true }
    ).lean().exec();

    if (!updated) {
      res.status(404).json({ error: 'Shipment not found.' });
      return;
    }

    await AuditLogModel.create({
      id: `audit-${Date.now()}`,
      adminId: req.user!.id,
      adminEmail: req.user!.email,
      action: 'PLACE_HOLD',
      targetId: id,
      details: { reason, customerExplanation },
      timestamp: now,
    });

    res.json({
      shipment: updated,
      message: 'Shipment placed On Hold. Movement paused and customer explanation logged.',
    });
  } catch (error) {
    console.error('MongoDB hold error:', error);
    res.status(500).json({ error: 'Failed to place shipment on hold.' });
  }
});

// POST /api/shipments/:id/resume — Resume from Hold
router.post('/:id/resume', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { revisedEstimatedDelivery, resumptionNote } = req.body as ResumeShipmentInput;

    const shipment = await ShipmentModel.findOne({ id }).lean().exec();

    if (!shipment) {
      res.status(404).json({ error: 'Shipment not found.' });
      return;
    }

    if (shipment.movementStatus !== 'On Hold') {
      res.status(400).json({ error: 'Shipment is not currently on hold.' });
      return;
    }

    const now = new Date().toISOString();

    let pausedElapsedSeconds = shipment.journeyPausedElapsedSeconds ?? 0;

    if (shipment.journeyPausedAt) {
      const pausedAtTime = new Date(shipment.journeyPausedAt).getTime();

      if (Number.isFinite(pausedAtTime)) {
        const holdDurationSeconds = Math.max(
          0,
          Math.round((Date.now() - pausedAtTime) / 1000)
        );

        pausedElapsedSeconds += holdDurationSeconds;
      }
    }

    const updated = await ShipmentModel.findOneAndUpdate(
      { id },
      {
        $set: {
          movementStatus: 'In Transit',
          status: 'In Transit',
          holdDetails: {
            ...shipment.holdDetails,
            isOnHold: false,
            resumedAt: now,
          },
          ...(revisedEstimatedDelivery
            ? { estimatedDelivery: revisedEstimatedDelivery }
            : {}),
          updatedAt: now,
          journeyPausedElapsedSeconds: pausedElapsedSeconds,
          journeyPausedAt: null,
        },
        $unset: {
          journeyProgressAtPause: 1,
        },
        $push: {
          milestones: {
            id: `ms-resume-${Date.now()}`,
            status: 'In Transit',
            title: 'Operational Hold Cleared — Transit Resumed',
            location: shipment.currentLocation.name,
            city: shipment.currentLocation.city,
            country: shipment.currentLocation.country,
            timestamp: now,
            notes: resumptionNote || 'Verification completed. Consignment released for onward routing.',
            operator: req.user!.name,
            completed: true,
            lat: shipment.currentLocation.lat,
            lng: shipment.currentLocation.lng,
          },
        },
      },
      { new: true, runValidators: true }
    ).lean().exec();

    if (!updated) {
      res.status(404).json({ error: 'Shipment not found.' });
      return;
    }

    await AuditLogModel.create({
      id: `audit-${Date.now()}`,
      adminId: req.user!.id,
      adminEmail: req.user!.email,
      action: 'RESUME_HOLD',
      targetId: id,
      details: { revisedEstimatedDelivery, resumptionNote },
      timestamp: now,
    });

    res.json({
      shipment: updated,
      message: 'Shipment resumed from hold. Movement status restored to In Transit.',
    });
  } catch (error) {
    console.error('MongoDB resume error:', error);
    res.status(500).json({ error: 'Failed to resume shipment.' });
  }
});
// POST /api/shipments/:id/milestones — Append Checkpoint
router.post('/:id/milestones', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const input = req.body as AddMilestoneInput;

    if (!input.status || !input.title || !input.location || !input.city || !input.country) {
      res.status(400).json({
        error: 'status, title, location, city, and country are required for checkpoints.',
      });
      return;
    }

    const shipment = await ShipmentModel.findOne({ id }).lean().exec();

    if (!shipment) {
      res.status(404).json({ error: 'Shipment not found.' });
      return;
    }

    const timestamp = input.timestamp || new Date().toISOString();

    const lat = input.lat || shipment.destinationHub.lat;
    const lng = input.lng || shipment.destinationHub.lng;

    const newMilestone = {
      id: `ms-${Date.now()}`,
      status: input.status,
      title: input.title,
      location: input.location,
      city: input.city,
      country: input.country,
      timestamp,
      notes: input.notes,
      operator: input.operator || req.user!.name,
      completed: true,
      lat,
      lng,
    };

    const updated = await ShipmentModel.findOneAndUpdate(
      { id },
      {
        $set: {
          movementStatus: input.status,
          status: input.status,
          currentLocation: {
            name: input.location,
            city: input.city,
            country: input.country,
            lat,
            lng,
          },
          updatedAt: timestamp,
          ...(input.status === 'Delivered' ? { actualDelivery: timestamp } : {}),
        },
        $push: {
          milestones: newMilestone,
        },
      },
      { new: true, runValidators: true }
    ).lean().exec();

    if (!updated) {
      res.status(404).json({ error: 'Shipment not found.' });
      return;
    }

    await AuditLogModel.create({
      id: `audit-${Date.now()}`,
      adminId: req.user!.id,
      adminEmail: req.user!.email,
      action: 'ADD_CHECKPOINT',
      targetId: id,
      details: {
        title: input.title,
        status: input.status,
        location: input.location,
      },
      timestamp,
    });

    res.status(201).json({
      shipment: updated,
      message: `Checkpoint added: ${input.title}`,
    });
  } catch (error) {
    console.error('MongoDB milestone error:', error);
    res.status(500).json({ error: 'Failed to append milestone.' });
  }
});
// DELETE /api/shipments/:id
router.delete('/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const deleted = await ShipmentModel.findOneAndDelete({ id }).exec();

    if (!deleted) {
      res.status(404).json({ error: 'Shipment not found.' });
      return;
    }

    await AuditLogModel.create({
      id: `audit-${Date.now()}`,
      adminId: req.user!.id,
      adminEmail: req.user!.email,
      action: 'DELETE_SHIPMENT',
      targetId: id,
      timestamp: new Date().toISOString(),
    });

    res.json({ message: 'Shipment deleted from persistent storage.' });
  } catch (error) {
    console.error('MongoDB shipment deletion error:', error);
    res.status(500).json({ error: 'Failed to delete shipment.' });
  }
});
// GET /api/shipments/admin/audit-logs
router.get('/admin/audit-logs', authenticateToken, requireAdmin, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const logs = await AuditLogModel.find()
      .sort({ timestamp: -1 })
      .limit(100)
      .lean()
      .exec();

    res.json({ logs });
  } catch (error) {
    console.error('MongoDB audit log retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve audit logs.' });
  }
});
export default router;
