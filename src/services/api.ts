import { Shipment, CreateShipmentInput, AddMilestoneInput, MovementStatus, BookingStatus, PaymentStatus, ShipmentStats, User, HoldShipmentInput, ResumeShipmentInput } from '../types/shipment.js';


export interface SupportMessage {
  id: string;
  shipmentId: string;
  senderId: string;
  senderName: string;
  senderRole: 'customer' | 'admin';
  text: string;
  attachments: {
    name: string;
    url: string;
    type: string;
    size: number;
  }[];
  createdAt: string;
}
export interface RecipientSupportMessage {
  id: string;
  shipmentId: string;
  senderId: string;
  senderName: string;
  senderRole: 'recipient' | 'admin';
  text: string;
  attachments: {
    name: string;
    url: string;
    type: string;
    size: number;
  }[];
  createdAt: string;
}
const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('freightplus_token') || localStorage.getItem('freightplus_admin_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getAdminAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('freightplus_admin_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data as T;
}

export const api = {
  auth: {
    // Customer Authentication
    async login(email: string, password: string): Promise<{ user: User; token: string; message: string }> {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      return handleResponse(res);
    },

    async register(data: {
  name: string;
  email: string;
  password: string;
  company?: string;
  phone?: string;
}): Promise<{
  message: string;
  requiresVerification: boolean;
  email: string;
}> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
},
async verifyEmail(email: string, code: string): Promise<{
  user: User;
  token: string;
  message: string;
}> {
  const res = await fetch(`${API_BASE}/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  return handleResponse(res);
},

async resendVerification(email: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/auth/resend-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return handleResponse(res);
},

async forgotPassword(email: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return handleResponse(res);
},

async resetPassword(
  email: string,
  code: string,
  newPassword: string
): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, newPassword }),
  });
  return handleResponse(res);
},

    async getMe(): Promise<{ user: User }> {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { ...getAuthHeader() },
      });
      return handleResponse(res);
    },

    // Protected Administrator Authentication
    async getAdminStatus(): Promise<{ isInitialized: boolean }> {
      const res = await fetch(`${API_BASE}/auth/admin/status`);
      return handleResponse(res);
    },

    async setupAdmin(data: { name: string; email: string; password: string; setupSecret: string }): Promise<{ user: User; token: string; message: string }> {
      const res = await fetch(`${API_BASE}/auth/admin/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },

    async adminLogin(email: string, password: string): Promise<{ user: User; token: string; message: string }> {
      const res = await fetch(`${API_BASE}/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      return handleResponse(res);
    },

    async changeAdminPassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
      const res = await fetch(`${API_BASE}/auth/admin/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAdminAuthHeader(),
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      return handleResponse(res);
    },
  },

  track: {
    async getByTrackingNumber(identifier: string): Promise<{
      shipment: Shipment;
      progressPercentage: number;
      hoursRemaining: number;
      isDelivered: boolean;
      isOnHold: boolean;
      currentCheckpoint: any;
      origin: any;
      destination: any;
    }> {
      const res = await fetch(`${API_BASE}/track/${encodeURIComponent(identifier.trim())}`);
      return handleResponse(res);
    },
  },

  shipments: {
    // Client sees own shipments; Admin sees all
    async getAll(params?: { movementStatus?: string; bookingStatus?: string; search?: string }): Promise<{ shipments: Shipment[]; count: number }> {
      const query = new URLSearchParams();
      if (params?.movementStatus && params.movementStatus !== 'All') query.set('movementStatus', params.movementStatus);
      if (params?.bookingStatus && params.bookingStatus !== 'All') query.set('bookingStatus', params.bookingStatus);
      if (params?.search) query.set('search', params.search);

      const url = `${API_BASE}/shipments${query.toString() ? `?${query.toString()}` : ''}`;
      const res = await fetch(url, {
        headers: { ...getAuthHeader() },
      });
      return handleResponse(res);
    },

    async getById(id: string): Promise<{ shipment: Shipment }> {
      const res = await fetch(`${API_BASE}/shipments/${id}`, {
        headers: { ...getAuthHeader() },
      });
      return handleResponse(res);
    },

    async create(input: CreateShipmentInput): Promise<{ shipment: Shipment; trackingUrl: string; message: string }> {
      const res = await fetch(`${API_BASE}/shipments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify(input),
      });
      return handleResponse(res);
    },

    // Administrator Exclusive API Methods
    async updateBookingStatus(id: string, bookingStatus: BookingStatus): Promise<{ shipment: Shipment; message: string }> {
      const res = await fetch(`${API_BASE}/shipments/${id}/booking-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAdminAuthHeader(),
        },
        body: JSON.stringify({ bookingStatus }),
      });
      return handleResponse(res);
    },

    async updatePaymentStatus(id: string, paymentStatus: PaymentStatus): Promise<{ shipment: Shipment; message: string }> {
      const res = await fetch(`${API_BASE}/shipments/${id}/payment-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAdminAuthHeader(),
        },
        body: JSON.stringify({ paymentStatus }),
      });
      return handleResponse(res);
    },

    async authorizeDispatch(id: string, carrierFlightOrVessel?: string): Promise<{ shipment: Shipment; message: string }> {
      const res = await fetch(`${API_BASE}/shipments/${id}/authorize-dispatch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAdminAuthHeader(),
        },
        body: JSON.stringify({ carrierFlightOrVessel }),
      });
      return handleResponse(res);
    },

    async placeHold(id: string, reason: string, customerExplanation: string): Promise<{ shipment: Shipment; message: string }> {
      const res = await fetch(`${API_BASE}/shipments/${id}/hold`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAdminAuthHeader(),
        },
        body: JSON.stringify({ reason, customerExplanation }),
      });
      return handleResponse(res);
    },

    async resumeHold(id: string, revisedEstimatedDelivery?: string, resumptionNote?: string): Promise<{ shipment: Shipment; message: string }> {
      const res = await fetch(`${API_BASE}/shipments/${id}/resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAdminAuthHeader(),
        },
        body: JSON.stringify({ revisedEstimatedDelivery, resumptionNote }),
      });
      return handleResponse(res);
    },

    async addMilestone(id: string, input: AddMilestoneInput): Promise<{ shipment: Shipment; message: string }> {
      const res = await fetch(`${API_BASE}/shipments/${id}/milestones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAdminAuthHeader(),
        },
        body: JSON.stringify(input),
      });
      return handleResponse(res);
    },

    async delete(id: string): Promise<{ message: string }> {
      const res = await fetch(`${API_BASE}/shipments/${id}`, {
        method: 'DELETE',
        headers: { ...getAdminAuthHeader() },
      });
      return handleResponse(res);
    },

    async getAuditLogs(): Promise<{ logs: any[] }> {
      const res = await fetch(`${API_BASE}/shipments/admin/audit-logs`, {
        headers: { ...getAdminAuthHeader() },
      });
      return handleResponse(res);
    },
  },

  async getStats(): Promise<{ stats: any }> {
  const res = await fetch(`${API_BASE}/stats`, {
    headers: { ...getAdminAuthHeader() },
  });
  return handleResponse(res);
},
stats: {
async get(): Promise<{ stats: ShipmentStats }> {
const res = await fetch(`${API_BASE}/stats`, {
headers: { ...getAuthHeader() },
});
return handleResponse(res);
},
},

support: {
async getMessages(shipmentId: string): Promise<{ messages: SupportMessage[] }> {
const res = await fetch(
`${API_BASE}/support/shipments/${encodeURIComponent(shipmentId)}/messages`, {
headers: { ...getAuthHeader() },
}
);
return handleResponse(res);
},

async getAdminSenderMessages(
  shipmentId: string
): Promise<{
  shipmentId: string;
  messages: SupportMessage[];
}> {
  const res = await fetch(
    `${API_BASE}/support/shipments/${encodeURIComponent(shipmentId)}/messages`,
    {
      headers: { ...getAdminAuthHeader() },
    }
  );

  return handleResponse(res);
},

async sendAdminSenderMessage(
  shipmentId: string,
  text: string,
  attachments: {
    name: string;
    url: string;
    type: string;
    size: number;
  }[] = []
): Promise<{ message: SupportMessage; status: string }> {
  const res = await fetch(
    `${API_BASE}/support/shipments/${encodeURIComponent(shipmentId)}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeader(),
      },
      body: JSON.stringify({ text, attachments }),
    }
  );

  return handleResponse(res);
},

async uploadAdminAttachment(
  shipmentId: string,
  file: File
): Promise<{
  attachment: {
    name: string;
    url: string;
    type: string;
    size: number;
  };
}> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(
    `${API_BASE}/support/shipments/${encodeURIComponent(shipmentId)}/upload`,
    {
      method: 'POST',
      headers: { ...getAdminAuthHeader() },
      body: formData,
    }
  );

  return handleResponse(res);
},

async sendMessage(
  shipmentId: string,
  text: string,
  attachments: {
    name: string;
    url: string;
    type: string;
    size: number;
  }[] = []
): Promise<{ message: SupportMessage; status: string }> {
  const res = await fetch(
    `${API_BASE}/support/shipments/${encodeURIComponent(shipmentId)}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ text, attachments }),
    }
  );

  return handleResponse(res);
},

async uploadAttachment(
  shipmentId: string,
  file: File
): Promise<{
  attachment: {
    name: string;
    url: string;
    type: string;
    size: number;
  };
  status: string;
}> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(
    `${API_BASE}/support/shipments/${encodeURIComponent(shipmentId)}/upload`,
    {
      method: 'POST',
      headers: {
        ...getAuthHeader(),
      },
      body: formData,
    }
  );

  return handleResponse(res);
},

async getRecipientMessages(
token: string
): Promise<{
shipmentId: string;
recipientName: string;
messages: RecipientSupportMessage[];
}> {
const res = await fetch(
`${API_BASE}/support/recipient/${encodeURIComponent(token)}/messages`
);

return handleResponse(res);
},

async getAdminRecipientMessages(
shipmentId: string
): Promise<{
shipmentId: string;
recipientName: string;
messages: RecipientSupportMessage[];
}> {
const res = await fetch(
`${API_BASE}/support/shipments/${encodeURIComponent(shipmentId)}/recipient-messages`,
{
headers: { ...getAdminAuthHeader() },
}
);

return handleResponse(res);
},

async sendAdminRecipientMessage(
shipmentId: string,
text: string,
attachments: {
name: string;
url: string;
type: string;
size: number;
}[] = []
): Promise<{ message: RecipientSupportMessage; status: string }> {
const res = await fetch(
`${API_BASE}/support/shipments/${encodeURIComponent(shipmentId)}/recipient-messages`,
{
method: 'POST',
headers: {
'Content-Type': 'application/json',
...getAdminAuthHeader(),
},
body: JSON.stringify({ text, attachments }),
}
);

return handleResponse(res);
},

async uploadRecipientAttachment(
token: string,
file: File
): Promise<{
attachment: {
name: string;
url: string;
type: string;
size: number;
};
status: string;
}> {
const formData = new FormData();
formData.append('file', file);

const res = await fetch(
`${API_BASE}/support/recipient/${encodeURIComponent(token)}/upload`,
{
method: 'POST',
body: formData,
}
);

return handleResponse(res);
},

async sendRecipientMessage(
token: string,
text: string,
attachments: {
name: string;
url: string;
type: string;
size: number;
}[] = []
): Promise<{ message: RecipientSupportMessage; status: string }> {
const res = await fetch(
`${API_BASE}/support/recipient/${encodeURIComponent(token)}/messages`,
{
method: 'POST',
headers: {
'Content-Type': 'application/json',
},
body: JSON.stringify({ text, attachments }),
}
);

return handleResponse(res);
},

},
};
