import { Router, Response } from 'express';
import {
  authenticateToken,
  AuthenticatedRequest,
} from '../auth.js';
import { Database } from '../db/fileDb.js';
import {
  ShipmentModel,
  RecipientSupportMessageModel,
} from '../db/models.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../cloudinary.js';

const isAllowedAttachmentUrl = (value: string): boolean => {
  // Continue supporting attachments saved on the old local storage.
  if (value.startsWith('/uploads/')) {
    return true;
  }

  // Accept HTTPS URLs belonging to this Cloudinary account only.
  try {
    const parsedUrl = new URL(value);
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

    return (
      parsedUrl.protocol === 'https:' &&
      parsedUrl.hostname === 'res.cloudinary.com' &&
      !!cloudName &&
      parsedUrl.pathname.startsWith(`/${cloudName}/`)
    );
  } catch {
    return false;
  }
};
const router = Router();
const recipientUploadsDir = path.resolve(process.cwd(), 'uploads');

if (!fs.existsSync(recipientUploadsDir)) {
fs.mkdirSync(recipientUploadsDir, { recursive: true });
}

const recipientUpload = multer({
storage: new CloudinaryStorage({
cloudinary,
params: async (_req, file) => {
const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '');

return {
  folder: 'freightplus/recipient-chat',
  resource_type: 'auto',
  public_id: `${Date.now()}-${safeName || 'attachment'}`,
};

},
}),
limits: {
fileSize: 10 * 1024 * 1024,
files: 1,
},
fileFilter: (_req, file, callback) => {
const allowedTypes = [
'image/jpeg',
'image/png',
'image/webp',
'application/pdf',
];

if (allowedTypes.includes(file.mimetype)) {
  callback(null, true);
} else {
  callback(new Error('Only JPG, PNG, WebP, and PDF files are allowed.'));
}

},
});

// Customer/Admin chat uploads — separate from recipient uploads.
const customerUpload = multer({
  storage: new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '');

    return {
      folder: 'freightplus/customer-support',
      resource_type: 'auto',
      public_id: `${Date.now()}-${safeName || 'attachment'}`,
    };
  },
}),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new Error('Only JPG, PNG, WebP, and PDF files are allowed.'));
    }
  },
});
// POST /api/support/shipments/:shipmentId/upload
// Separate authenticated upload route for customer/admin chat.
router.post(
  '/shipments/:shipmentId/upload',
  authenticateToken,
  (req: AuthenticatedRequest, res: Response, next): void => {
    try {
      const shipment = Database.findShipmentById(req.params.shipmentId);
      const user = req.user!;

      if (!shipment) {
        res.status(404).json({ error: 'Shipment not found.' });
        return;
      }

      if (user.role !== 'admin' && shipment.userId !== user.id) {
        res.status(403).json({
          error: 'You are not authorized to upload to this conversation.',
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Customer chat upload authorization failed:', error);
      res.status(500).json({
        error: 'Unable to authorize the attachment upload.',
      });
    }
  },
  (req, res, next): void => {
    customerUpload.single('file')(req, res, (error) => {
      if (error) {
        res.status(400).json({
          error: error.message || 'File upload failed.',
        });
        return;
      }

      next();
    });
  },
  (req, res): void => {
    if (!req.file) {
      res.status(400).json({
        error: 'Please select a file to upload.',
      });
      return;
    }

    res.status(201).json({
   attachment: {
  name: req.file.originalname,
  url: req.file.path,
  type: req.file.mimetype,
  size: req.file.size,
},
      status: 'Attachment uploaded successfully.',
    });
  }
);
// GET /api/support/shipments/:shipmentId/messages
// Customers can read only their own shipment conversations.
// Administrators can read any shipment conversation.
router.get(
  '/shipments/:shipmentId/messages',
  authenticateToken,
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const { shipmentId } = req.params;
      const user = req.user!;

      const shipment = Database.findShipmentById(shipmentId);

      if (!shipment) {
        res.status(404).json({ error: 'Shipment not found.' });
        return;
      }

      if (
        user.role !== 'admin' &&
        shipment.userId !== user.id
      ) {
        res.status(403).json({
          error: 'You are not authorized to access this conversation.',
        });
        return;
      }

      const messages = Database.getSupportMessages(shipmentId);

      res.json({ messages });
    } catch (error) {
      console.error('Failed to retrieve support messages:', error);
      res.status(500).json({
        error: 'Failed to retrieve support messages.',
      });
    }
  }
);
// POST /api/support/shipments/:shipmentId/messages
// Authenticated customers and admins can send text and attachments.
router.post(
  '/shipments/:shipmentId/messages',
  authenticateToken,
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const { shipmentId } = req.params;
      const user = req.user!;

      const text =
        typeof req.body?.text === 'string'
          ? req.body.text.trim()
          : '';

      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf',
      ];

      const rawAttachments = req.body?.attachments;

      if (
        rawAttachments !== undefined &&
        (!Array.isArray(rawAttachments) || rawAttachments.length > 1)
      ) {
        res.status(400).json({
          error: 'Please attach no more than one file per message.',
        });
        return;
      }

      const attachments = Array.isArray(rawAttachments)
        ? rawAttachments
        : [];

      for (const attachment of attachments) {
        if (
          !attachment ||
          typeof attachment.name !== 'string' ||
          typeof attachment.url !== 'string' ||
          !isAllowedAttachmentUrl(attachment.url) ||
          typeof attachment.type !== 'string' ||
          !allowedTypes.includes(attachment.type) ||
          typeof attachment.size !== 'number' ||
          attachment.size <= 0 ||
          attachment.size > 10 * 1024 * 1024
        ) {
          res.status(400).json({
            error: 'The attachment is invalid or unsupported.',
          });
          return;
        }
      }

      if (!text && attachments.length === 0) {
        res.status(400).json({
          error: 'Please enter a message or attach a file.',
        });
        return;
      }

      if (text.length > 5000) {
        res.status(400).json({
          error: 'Messages cannot exceed 5000 characters.',
        });
        return;
      }

      const shipment = Database.findShipmentById(shipmentId);

      if (!shipment) {
        res.status(404).json({ error: 'Shipment not found.' });
        return;
      }

      if (user.role !== 'admin' && shipment.userId !== user.id) {
        res.status(403).json({
          error: 'You are not authorized to message this shipment.',
        });
        return;
      }

      const message = Database.addSupportMessage({
        shipmentId,
        senderId: user.id,
        senderName: user.name,
        senderRole: user.role === 'admin' ? 'admin' : 'customer',
        text,
        attachments,
      });

      res.status(201).json({
        message,
        status: 'Message sent successfully.',
      });
    } catch (error) {
      console.error('Failed to send support message:', error);
      res.status(500).json({
        error: 'Failed to send support message.',
      });
    }
  }
);

// GET /api/support/shipments/:shipmentId/recipient-messages
// Administrators can read the recipient conversation separately from the sender conversation.
router.get(
  '/shipments/:shipmentId/recipient-messages',
  authenticateToken,
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const user = req.user!;
      const { shipmentId } = req.params;

      if (user.role !== 'admin') {
        res.status(403).json({
          error: 'Administrator access is required.',
        });
        return;
      }

      const shipment = Database.findShipmentById(shipmentId);

      if (!shipment) {
        res.status(404).json({ error: 'Shipment not found.' });
        return;
      }

      const messages =
        Database.getRecipientSupportMessages(shipmentId);

      res.json({
        shipmentId: shipment.id,
        recipientName: shipment.recipient.name,
        messages,
      });
    } catch (error) {
      console.error(
        'Failed to retrieve recipient support messages:',
        error
      );

      res.status(500).json({
        error: 'Failed to retrieve recipient messages.',
      });
    }
  }
);


// POST /api/support/shipments/:shipmentId/recipient-messages
// Administrators can reply to the recipient without accessing the sender's conversation.
router.post(
  '/shipments/:shipmentId/recipient-messages',
  authenticateToken,
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const user = req.user!;
      const { shipmentId } = req.params;

      if (user.role !== 'admin') {
        res.status(403).json({
          error: 'Administrator access is required.',
        });
        return;
      }

      const shipment = Database.findShipmentById(shipmentId);

      if (!shipment) {
        res.status(404).json({ error: 'Shipment not found.' });
        return;
      }

      const text =
        typeof req.body?.text === 'string'
          ? req.body.text.trim()
          : '';

      const rawAttachments = req.body?.attachments;
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf',
      ];

      if (
        rawAttachments !== undefined &&
        (!Array.isArray(rawAttachments) || rawAttachments.length > 1)
      ) {
        res.status(400).json({
          error: 'Please attach no more than one file per message.',
        });
        return;
      }

      const attachments = Array.isArray(rawAttachments)
        ? rawAttachments
        : [];

      for (const attachment of attachments) {
        if (
          !attachment ||
          typeof attachment.name !== 'string' ||
          typeof attachment.url !== 'string' ||
          !isAllowedAttachmentUrl(attachment.url) ||
          typeof attachment.type !== 'string' ||
          !allowedTypes.includes(attachment.type) ||
          typeof attachment.size !== 'number' ||
          attachment.size <= 0 ||
          attachment.size > 10 * 1024 * 1024
        ) {
          res.status(400).json({
            error: 'The attachment is invalid or unsupported.',
          });
          return;
        }
      }

      if (!text && attachments.length === 0) {
        res.status(400).json({
          error: 'Please enter a message or attach a file.',
        });
        return;
      }

      if (text.length > 5000) {
        res.status(400).json({
          error: 'Messages cannot exceed 5000 characters.',
        });
        return;
      }

      const message = Database.addRecipientSupportMessage({
        shipmentId,
        senderId: user.id,
        senderName: user.name,
        senderRole: 'admin',
        text,
        attachments,
      });

      res.status(201).json({
        message,
        status: 'Recipient reply sent successfully.',
      });
    } catch (error) {
      console.error('Failed to send recipient support reply:', error);

      res.status(500).json({
        error: 'Failed to send recipient reply.',
      });
    }
  }
);

// ============================================================
// Recipient Support — access through the recipient tracking link
// ============================================================

// GET recipient messages using the secure tracking token.
router.get('/recipient/:token/messages', async (req, res): Promise<void> => {
  try {
    const token = req.params.token;

    // Only the actual tracking token grants recipient chat access.
    const shipment = await ShipmentModel.findOne({
      trackingToken: token,
    }).lean().exec();

    if (!shipment) {
      res.status(404).json({ error: 'Invalid recipient tracking link.' });
      return;
    }

    const messages = await RecipientSupportMessageModel.find({
      shipmentId: shipment.id,
    })
      .sort({ createdAt: 1 })
      .lean()
      .exec();

    res.json({
      shipmentId: shipment.id,
      recipientName: shipment.recipient.name,
      messages,
    });
  } catch (error) {
    console.error('Failed to load recipient support messages:', error);
    res.status(500).json({
      error: 'Unable to load recipient messages.',
    });
  }
});

// POST a recipient message.
router.post('/recipient/:token/messages', async (req, res): Promise<void> => {
  try {
    const token = req.params.token;

    const shipment = await ShipmentModel.findOne({
      trackingToken: token,
    }).lean().exec();

    // A tracking number alone must never authorize recipient messaging.
    if (!shipment) {
      res.status(404).json({ error: 'Invalid recipient tracking link.' });
      return;
    }

    const text =
      typeof req.body?.text === 'string'
        ? req.body.text.trim()
        : '';

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ];

    const rawAttachments = req.body?.attachments;

    if (
      rawAttachments !== undefined &&
      (!Array.isArray(rawAttachments) || rawAttachments.length > 1)
    ) {
      res.status(400).json({
        error: 'Please attach no more than one file per message.',
      });
      return;
    }

    const attachments = Array.isArray(rawAttachments)
      ? rawAttachments
      : [];

    for (const attachment of attachments) {
      if (
        !attachment ||
        typeof attachment.name !== 'string' ||
        typeof attachment.url !== 'string' ||
        !isAllowedAttachmentUrl(attachment.url) ||
        typeof attachment.type !== 'string' ||
        !allowedTypes.includes(attachment.type) ||
        typeof attachment.size !== 'number' ||
        attachment.size <= 0 ||
        attachment.size > 10 * 1024 * 1024
      ) {
        res.status(400).json({
          error: 'The attachment is invalid or unsupported.',
        });
        return;
      }
    }

    if (!text && attachments.length === 0) {
      res.status(400).json({
        error: 'Please enter a message or attach a file.',
      });
      return;
    }

    if (text.length > 5000) {
      res.status(400).json({
        error: 'Message is too long.',
      });
      return;
    }

    const message = await RecipientSupportMessageModel.create({
      id: `recipient-msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      shipmentId: shipment.id,
      senderId: `recipient-${shipment.id}`,
      senderName: shipment.recipient.name || 'Recipient',
      senderRole: 'recipient',
      text,
      attachments,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({
      message: message.toObject(),
      status: 'Recipient message sent successfully.',
    });
  } catch (error) {
    console.error('Failed to send recipient support message:', error);
    res.status(500).json({
      error: 'Unable to send recipient message.',
    });
  }
});

// POST /api/support/recipient/:token/upload
// Upload an attachment for the recipient support chat.
router.post(
  '/recipient/:token/upload',

  // Validate the secure tracking token before accepting the file.
  async (req, res, next): Promise<void> => {
    try {
      const shipment = await ShipmentModel.findOne({
        trackingToken: req.params.token,
      }).select('id trackingToken').lean().exec();

      if (!shipment) {
        res.status(404).json({
          error: 'Invalid recipient tracking link.',
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Recipient upload authorization failed:', error);
      res.status(500).json({
        error: 'Unable to validate recipient tracking link.',
      });
    }
  },

  (req, res, next): void => {
    recipientUpload.single('file')(req, res, (error) => {
      if (error) {
        res.status(400).json({
          error: error.message || 'File upload failed.',
        });
        return;
      }

      next();
    });
  },

  (req, res): void => {
    try {
      if (!req.file) {
        res.status(400).json({
          error: 'Please select a file to upload.',
        });
        return;
      }

      res.status(201).json({
        attachment: {
          name: req.file.originalname,
          url: req.file.path,
          type: req.file.mimetype,
          size: req.file.size,
        },
        status: 'Attachment uploaded successfully.',
      });
    } catch (error) {
      console.error('Recipient attachment upload failed:', error);
      res.status(500).json({
        error: 'Unable to upload attachment.',
      });
    }
  }
);
export default router;