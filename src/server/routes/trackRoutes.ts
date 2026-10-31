import { Router, Request, Response } from 'express';
import { ShipmentModel } from '../db/models.js';
import { calculateShipmentProgress } from '../../utils/shipmentProgress.js';

const router = Router();

// Mask private email address (e.g. k***@domain.com)
function maskEmail(email?: string): string {
  if (!email || !email.includes('@')) return 'Protected';
  const [local, domain] = email.split('@');
  return `${local.slice(0, 1)}***@${domain}`;
}

// GET /api/track/:identifier
// Accepts trackingNumber, consignmentNumber, or secure trackingToken.
router.get('/:identifier', async (req: Request, res: Response): Promise<void> => {
  try {
    const identifier = req.params.identifier?.trim();

    if (!identifier) {
      res.status(400).json({
        error: 'Tracking number or consignment ID is required.',
      });
      return;
    }

    // Search MongoDB using all three supported identifiers.
    const shipment = await ShipmentModel.findOne({
      $or: [
        { trackingNumber: identifier },
        { consignmentNumber: identifier },
        { trackingToken: identifier },
      ],
    }).lean().exec();

    if (!shipment) {
      res.status(404).json({
        error: `No shipment found for consignment reference "${identifier}". Please verify the number.`,
      });
      return;
    }

    const progressPercentage = calculateShipmentProgress({
      movementStatus: shipment.movementStatus,
      journeyStartedAt: shipment.journeyStartedAt,
      journeyDurationSeconds: shipment.journeyDurationSeconds,
      journeyPausedElapsedSeconds: shipment.journeyPausedElapsedSeconds ?? 0,
      journeyPausedAt: shipment.journeyPausedAt,
      journeyProgressAtPause: shipment.journeyProgressAtPause,
    });

    // Calculate hours remaining.
    const now = Date.now();
    const estTime = new Date(shipment.estimatedDelivery).getTime();
    const hoursRemaining = Math.max(
      0,
      Math.round((estTime - now) / (1000 * 3600))
    );

    // Privacy protection: sanitize personal details for public tracking.
    const sanitizedShipment = {
      id: shipment.id,
      trackingNumber: shipment.trackingNumber,
      consignmentNumber: shipment.consignmentNumber,
      trackingToken: shipment.trackingToken,
      title: shipment.title,

      // Separate shipment statuses.
      bookingStatus: shipment.bookingStatus,
      paymentStatus: shipment.paymentStatus,
      movementStatus: shipment.movementStatus,
      status: shipment.movementStatus,

      serviceType: shipment.serviceType,

      // Protected sender details.
      sender: {
        name: shipment.sender.company || shipment.sender.name,
        company: shipment.sender.company,
        city: shipment.sender.city,
        country: shipment.sender.country,
        airportOrPortCode: shipment.sender.airportOrPortCode,
        maskedEmail: maskEmail(shipment.sender.email),
      },

      // Protected recipient details.
      recipient: {
        name: shipment.recipient.name,
        company: shipment.recipient.company,
        city: shipment.recipient.city,
        country: shipment.recipient.country,
        airportOrPortCode: shipment.recipient.airportOrPortCode,
      },

      originHub: shipment.originHub,
      destinationHub: shipment.destinationHub,
      currentLocation: shipment.currentLocation,
      cargoDetails: shipment.cargoDetails,
      carrier: shipment.carrier,

      pricing: {
        totalAmount: shipment.pricing.totalAmount,
        currency: shipment.pricing.currency,
        payer: shipment.pricing.payer,
      },

      // Expose the customer-facing hold explanation, not internal admin notes.
      holdDetails: {
        isOnHold: shipment.holdDetails.isOnHold,
        customerExplanation: shipment.holdDetails.customerExplanation,
        placedOnHoldAt: shipment.holdDetails.placedOnHoldAt,
      },

      milestones: shipment.milestones,
      estimatedDelivery: shipment.estimatedDelivery,
      dispatchDate: shipment.dispatchDate,
      actualDelivery: shipment.actualDelivery,
      updatedAt: shipment.updatedAt,
      signatureRequired: shipment.signatureRequired,
    };

    res.json({
      shipment: sanitizedShipment,
      progressPercentage,
      hoursRemaining,
      isDelivered: shipment.movementStatus === 'Delivered',
      isOnHold: shipment.movementStatus === 'On Hold',
      currentCheckpoint:
        shipment.milestones?.[shipment.milestones.length - 1] || null,
      origin: shipment.originHub,
      destination: shipment.destinationHub,
    });
  } catch (error) {
    console.error('MongoDB tracking lookup error:', error);
    res.status(500).json({
      error: 'Failed to retrieve tracking details.',
    });
  }
});

export default router;